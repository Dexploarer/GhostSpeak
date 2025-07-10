## 🛠️ Troubleshooting

### Command Not Found

If you see "command not found" after installing globally, add your global bin directory to your
PATH:

- For npm:
  ```sh
  export PATH="$(npm bin -g):$PATH"
  ```
- For Bun:
  ```sh
  export PATH="$HOME/.bun/bin:$PATH"
  ```

Restart your terminal or run the above command to use CLI commands from anywhere.
