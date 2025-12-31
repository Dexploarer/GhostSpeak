package config

import (
	"fmt"
	"io"
	"os"

	"github.com/sirupsen/logrus"
)

var globalLogger *logrus.Logger

// InitLogger initializes the global logger with configuration
func InitLogger(cfg *Config) *logrus.Logger {
	logger := logrus.New()

	// Set output
	logger.SetOutput(os.Stdout)

	// Set log level
	level, err := logrus.ParseLevel(cfg.Logging.Level)
	if err != nil {
		logger.Warnf("Invalid log level %s, defaulting to info", cfg.Logging.Level)
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)

	// Set formatter
	switch cfg.Logging.Format {
	case "json":
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
			},
		})
	default:
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02 15:04:05",
			ForceColors:     true,
		})
	}

	globalLogger = logger
	return logger
}

// GetLogger returns the global logger instance
func GetLogger() *logrus.Logger {
	if globalLogger == nil {
		// Initialize with defaults if not already initialized
		cfg := GetDefaultConfig()
		return InitLogger(cfg)
	}
	return globalLogger
}

// SetLogLevel updates the log level dynamically
func SetLogLevel(level string) error {
	logger := GetLogger()
	parsedLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return fmt.Errorf("invalid log level: %w", err)
	}
	logger.SetLevel(parsedLevel)
	return nil
}

// SetLogOutput sets the output destination for logs
func SetLogOutput(w io.Writer) {
	logger := GetLogger()
	logger.SetOutput(w)
}

// WithField creates a logger entry with a single field
func WithField(key string, value interface{}) *logrus.Entry {
	return GetLogger().WithField(key, value)
}

// WithFields creates a logger entry with multiple fields
func WithFields(fields logrus.Fields) *logrus.Entry {
	return GetLogger().WithFields(fields)
}

// WithError creates a logger entry with an error field
func WithError(err error) *logrus.Entry {
	return GetLogger().WithError(err)
}

// Debug logs a debug message
func Debug(args ...interface{}) {
	GetLogger().Debug(args...)
}

// Debugf logs a formatted debug message
func Debugf(format string, args ...interface{}) {
	GetLogger().Debugf(format, args...)
}

// Info logs an info message
func Info(args ...interface{}) {
	GetLogger().Info(args...)
}

// Infof logs a formatted info message
func Infof(format string, args ...interface{}) {
	GetLogger().Infof(format, args...)
}

// Warn logs a warning message
func Warn(args ...interface{}) {
	GetLogger().Warn(args...)
}

// Warnf logs a formatted warning message
func Warnf(format string, args ...interface{}) {
	GetLogger().Warnf(format, args...)
}

// Error logs an error message
func Error(args ...interface{}) {
	GetLogger().Error(args...)
}

// Errorf logs a formatted error message
func Errorf(format string, args ...interface{}) {
	GetLogger().Errorf(format, args...)
}

// Fatal logs a fatal message and exits
func Fatal(args ...interface{}) {
	GetLogger().Fatal(args...)
}

// Fatalf logs a formatted fatal message and exits
func Fatalf(format string, args ...interface{}) {
	GetLogger().Fatalf(format, args...)
}
