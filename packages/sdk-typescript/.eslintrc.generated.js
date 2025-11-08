export default {
  // Configuration specifically for generated files
  rules: {
    // Allow duplicate function declarations for overloads in generated code
    'no-redeclare': 'off',

    // Allow logical OR in generated code where nullish coalescing might not be appropriate
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    
    // Allow unused variables in generated code (often used for type constraints)
    '@typescript-eslint/no-unused-vars': 'off',
    
    // Allow any types in generated code when necessary
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Allow empty interfaces in generated code
    '@typescript-eslint/no-empty-interface': 'off',
    
    // Allow console statements in generated code
    'no-console': 'off',
    
    // Allow non-null assertions in generated code
    '@typescript-eslint/no-non-null-assertion': 'off',
    
    // Allow function declarations after usage in generated code
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    
    // Allow require statements in generated code
    '@typescript-eslint/no-var-requires': 'off'
  }
}