# TipsyTraveller

## Run on your phone with Expo Go

This project uses Expo SDK 58, matching the current Expo Go release.

1. Install or update **Expo Go** on your phone.
2. Put your phone and Mac on the same Wi-Fi network.
3. Install dependencies once with `npm install`.
4. In this folder, run:

   ```bash
   npm start
   ```

5. Scan the terminal QR code with your iPhone camera or from Expo Go on Android.

On iPhone, sign in to the same Expo account in Expo Go and the Expo CLI if the
app asks you to. If the local network blocks the connection, use:

```bash
npm run start:tunnel
```

The tunnel is slower, but it works when the phone cannot reach the Mac directly.

After upgrading dependencies or if Expo Go shows a stale bundle, restart with:

```bash
npm start -- --clear
```
