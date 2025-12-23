# Kitchen Display - Kiosk Mode Setup

This guide explains how to run the Kitchen Display System in **Kiosk Mode** for automatic, silent printing without dialog boxes.

## What is Kiosk Mode?

Kiosk Mode runs Chrome in a locked-down, full-screen mode with enhanced printing capabilities. When combined with the `--kiosk-printing` flag, it automatically prints to the default printer without showing print dialogs.

## Prerequisites

1. **Chrome Browser** installed on the kitchen computer
2. **Default Printer** configured in Windows
3. **Development Server** running (`npm run dev`)

## Setup Instructions

### Step 1: Set Default Printer

1. Go to **Windows Settings** → **Devices** → **Printers & scanners**
2. Select your kitchen receipt printer
3. Click **"Manage"** → **"Set as default"**

### Step 2: Launch Kitchen Display in Kiosk Mode

#### Option A: Using the Batch Script (Recommended)

1. Double-click `launch-kitchen-kiosk.bat` in the project root
2. The Kitchen Display will open in full-screen kiosk mode

#### Option B: Manual Command

Open **Command Prompt** and run:

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000/admin/kitchen
```

**For production (deployed app):**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://your-domain.com/admin/kitchen
```

### Step 3: Enable Auto-Print

1. Click the **"Start Shift & Enable Audio"** button
2. Toggle **"Auto-Print"** to **ON** in the top-right corner
3. New orders will now print automatically without dialogs

## How It Works

```
New Order Arrives → Added to Print Queue → 
Automatically Prints to Default Printer → 
No Dialog Shown → Next Order Prints
```

## Exiting Kiosk Mode

- Press **Alt + F4** to close the kiosk window
- Or use **Ctrl + Alt + Delete** → Task Manager → Close Chrome

## Troubleshooting

### Prints are not working
- Verify the printer is set as default in Windows
- Check that the printer is turned on and has paper
- Test a manual print from any application

### App won't launch
- Ensure `npm run dev` is running on port 3000
- Check Chrome is installed at the default path
- Try the manual command to see error messages

### Wrong printer prints
- Set the correct printer as default in Windows Settings
- Kiosk mode always uses the system default printer

## Production Deployment

For a deployed app, update the batch script URL:
```batch
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://your-domain.com/admin/kitchen
```

## Advanced: Auto-Start on Boot

To launch the kitchen display automatically when the computer starts:

1. Press `Win + R`, type `shell:startup`, press Enter
2. Right-click → **New** → **Shortcut**
3. Browse to `launch-kitchen-kiosk.bat`
4. Name it "Kitchen Display"
5. Restart the computer to test

## Security Note

Kiosk mode locks the browser to a single URL and disables most browser controls. This is ideal for dedicated kitchen computers but should not be used on shared workstations.
