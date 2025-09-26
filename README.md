# Configuration Guide for `src/admin/js/config.js`

## Overview
The `config.js` file located in `src/admin/js/` is used to define the `BASE_URL` for API requests in the Restaurant Management System frontend. This configuration allows the application to communicate with the backend server, which can be hosted locally during development or on a specific IP address in a production or testing environment.

## Setting the `BASE_URL`

The `BASE_URL` variable determines the endpoint for all API calls made by the frontend. You can configure it based on your environment (development, testing, or production). Below are the instructions for setting the `BASE_URL`:

### Development Environment
- **Localhost**: When developing locally, set the `BASE_URL` to point to your local machine.
  ```javascript
  const BASE_URL = 'http://localhost:8000';
  ```
  Alternatively, you can use:
  ```javascript
  const BASE_URL = 'http://127.0.0.1:8000';
  ```
- Ensure the backend server is running on the specified port (e.g., `8000`).

### Production or Testing Environment
- **Custom IP Address**: In a production or networked environment, set the `BASE_URL` to the IP address of the machine hosting the backend server.
  - To find the IP address:
    - **Windows**: Open a Command Prompt and run:
      ```bash
      ipconfig
      ```
      Look for the `IPv4 Address` under your active network adapter (e.g., `192.168.1.100`).
    - **Linux/Mac**: Open a terminal and run:
      ```bash
      ifconfig
      ```
      Look for the `inet` address under your active network interface (e.g., `eth0` or `wlan0`).
  - Example configuration:
    ```javascript
    const BASE_URL = 'http://192.168.1.100:5000';
    ```
  - Replace `192.168.1.100` with the actual IP address of the backend server and adjust the port if necessary.

## Configuration Steps
1. Open the `src/admin/js/config.js` file in a text editor.
2. Locate the `BASE_URL` variable.
3. Update the value based on your environment:
   - Use `http://localhost:5000` or `http://127.0.0.1:5000` for local development.
   - Use the server’s IP address (e.g., `http://<your-ip>:5000`) for networked environments.
4. Save the file and restart the frontend application if necessary.

## Example `config.js`
```javascript
// src/admin/js/config.js

// Base URL for API requests
const BASE_URL = 'http://localhost:5000'; // Use localhost for development
// const BASE_URL = 'http://192.168.1.100:5000'; // Uncomment and replace with your server's IP for production/testing

export default BASE_URL;
```

## Notes
- Ensure the backend server is running and accessible at the specified `BASE_URL`.
- Verify network connectivity if using a custom IP address, especially in a local network setup.
- If the backend uses a different port, update the port number in `BASE_URL` accordingly.
- For secure connections in production, consider using `https://` if the backend supports SSL.