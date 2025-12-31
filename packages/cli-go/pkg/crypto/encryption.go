package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"

	"golang.org/x/crypto/pbkdf2"
)

const (
	// SaltSize is the size of the salt in bytes
	SaltSize = 32
	// NonceSize is the size of the nonce in bytes (GCM standard)
	NonceSize = 12
	// KeySize is the size of the encryption key in bytes (AES-256)
	KeySize = 32
	// PBKDF2Iterations is the number of iterations for PBKDF2
	PBKDF2Iterations = 100000
)

// GenerateSalt generates a random salt
func GenerateSalt() ([]byte, error) {
	salt := make([]byte, SaltSize)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}
	return salt, nil
}

// DeriveKey derives an encryption key from a password using PBKDF2
func DeriveKey(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, PBKDF2Iterations, KeySize, sha256.New)
}

// Encrypt encrypts plaintext using AES-256-GCM
func Encrypt(plaintext []byte, password string, salt []byte) (ciphertext, nonce []byte, err error) {
	// Derive key from password
	key := DeriveKey(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate nonce
	nonce = make([]byte, NonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt
	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)

	return ciphertext, nonce, nil
}

// Decrypt decrypts ciphertext using AES-256-GCM
func Decrypt(ciphertext []byte, password string, salt, nonce []byte) ([]byte, error) {
	// Derive key from password
	key := DeriveKey(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Decrypt
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

// EncryptPrivateKey encrypts a private key with a password
func EncryptPrivateKey(privateKey []byte, password string) (encrypted, salt, nonce []byte, err error) {
	// Generate salt
	salt, err = GenerateSalt()
	if err != nil {
		return nil, nil, nil, err
	}

	// Encrypt
	encrypted, nonce, err = Encrypt(privateKey, password, salt)
	if err != nil {
		return nil, nil, nil, err
	}

	return encrypted, salt, nonce, nil
}

// DecryptPrivateKey decrypts a private key with a password
func DecryptPrivateKey(encrypted []byte, password string, salt, nonce []byte) ([]byte, error) {
	return Decrypt(encrypted, password, salt, nonce)
}
