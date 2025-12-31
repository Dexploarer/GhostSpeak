package storage

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"time"

	"github.com/dgraph-io/badger/v4"
	"github.com/ghostspeak/cli-go/internal/config"
)

// BadgerDB wraps badger database for caching
type BadgerDB struct {
	db *badger.DB
}

// NewBadgerDB creates a new BadgerDB instance
func NewBadgerDB(cfg *config.Config) (*BadgerDB, error) {
	dbPath := filepath.Join(cfg.Storage.CacheDir, "badger")

	opts := badger.DefaultOptions(dbPath)
	opts.Logger = nil // Disable badger's internal logging

	db, err := badger.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open badger db: %w", err)
	}

	return &BadgerDB{db: db}, nil
}

// Close closes the database
func (b *BadgerDB) Close() error {
	return b.db.Close()
}

// Set stores a key-value pair
func (b *BadgerDB) Set(key string, value []byte) error {
	return b.db.Update(func(txn *badger.Txn) error {
		return txn.Set([]byte(key), value)
	})
}

// SetWithTTL stores a key-value pair with a time-to-live
func (b *BadgerDB) SetWithTTL(key string, value []byte, ttl time.Duration) error {
	return b.db.Update(func(txn *badger.Txn) error {
		entry := badger.NewEntry([]byte(key), value).WithTTL(ttl)
		return txn.SetEntry(entry)
	})
}

// Get retrieves a value by key
func (b *BadgerDB) Get(key string) ([]byte, error) {
	var value []byte

	err := b.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(key))
		if err != nil {
			return err
		}

		value, err = item.ValueCopy(nil)
		return err
	})

	if err == badger.ErrKeyNotFound {
		return nil, nil
	}

	return value, err
}

// Delete removes a key-value pair
func (b *BadgerDB) Delete(key string) error {
	return b.db.Update(func(txn *badger.Txn) error {
		return txn.Delete([]byte(key))
	})
}

// Has checks if a key exists
func (b *BadgerDB) Has(key string) (bool, error) {
	err := b.db.View(func(txn *badger.Txn) error {
		_, err := txn.Get([]byte(key))
		return err
	})

	if err == badger.ErrKeyNotFound {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return true, nil
}

// Keys returns all keys with a given prefix
func (b *BadgerDB) Keys(prefix string) ([]string, error) {
	var keys []string

	err := b.db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchValues = false
		it := txn.NewIterator(opts)
		defer it.Close()

		prefixBytes := []byte(prefix)
		for it.Seek(prefixBytes); it.ValidForPrefix(prefixBytes); it.Next() {
			item := it.Item()
			key := string(item.Key())
			keys = append(keys, key)
		}

		return nil
	})

	return keys, err
}

// SetJSON stores a value as JSON
func (b *BadgerDB) SetJSON(key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}
	return b.Set(key, data)
}

// SetJSONWithTTL stores a value as JSON with TTL
func (b *BadgerDB) SetJSONWithTTL(key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}
	return b.SetWithTTL(key, data, ttl)
}

// GetJSON retrieves a value and unmarshals it from JSON
func (b *BadgerDB) GetJSON(key string, target interface{}) error {
	data, err := b.Get(key)
	if err != nil {
		return err
	}

	if data == nil {
		return nil
	}

	return json.Unmarshal(data, target)
}

// Clear removes all keys with a given prefix
func (b *BadgerDB) Clear(prefix string) error {
	return b.db.Update(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchValues = false
		it := txn.NewIterator(opts)
		defer it.Close()

		prefixBytes := []byte(prefix)
		for it.Seek(prefixBytes); it.ValidForPrefix(prefixBytes); it.Next() {
			item := it.Item()
			if err := txn.Delete(item.Key()); err != nil {
				return err
			}
		}

		return nil
	})
}

// RunGC runs the garbage collector
func (b *BadgerDB) RunGC(discardRatio float64) error {
	return b.db.RunValueLogGC(discardRatio)
}
