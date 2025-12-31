package ports

import "time"

// Storage defines the interface for key-value storage
type Storage interface {
	// Set stores a key-value pair
	Set(key string, value []byte) error

	// SetWithTTL stores a key-value pair with a time-to-live
	SetWithTTL(key string, value []byte, ttl time.Duration) error

	// Get retrieves a value by key
	Get(key string) ([]byte, error)

	// Delete removes a key-value pair
	Delete(key string) error

	// Has checks if a key exists
	Has(key string) (bool, error)

	// Keys returns all keys with a given prefix
	Keys(prefix string) ([]string, error)

	// SetJSON stores a value as JSON
	SetJSON(key string, value interface{}) error

	// SetJSONWithTTL stores a value as JSON with TTL
	SetJSONWithTTL(key string, value interface{}, ttl time.Duration) error

	// GetJSON retrieves a value and unmarshals it from JSON
	GetJSON(key string, target interface{}) error

	// Clear removes all keys with a given prefix
	Clear(prefix string) error

	// Close closes the storage
	Close() error
}
