# 🚀 Quick Start Guide - Backend Server

## ✅ Port 5000 Issue - FIXED PERMANENTLY

**Problem**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**: Automatic port cleanup before server start ✅

---

## 🎯 How to Start Server

### **Method 1: Normal Start (Recommended)** ✅

```bash
cd backend
npm start
```

**What happens automatically**:
1. ✅ Port 5000 cleanup (kills any process using port 5000)
2. ✅ Server starts on port 5000
3. ✅ All routes loaded

### **Method 2: Development Mode**

```bash
cd backend
npm run dev
```

**What happens automatically**:
1. ✅ Port 5000 cleanup
2. ✅ TypeScript compilation
3. ✅ Watch mode enabled
4. ✅ Auto-restart on file changes

---

## 🛠️ Manual Port Cleanup

If you need to manually free port 5000:

```bash
cd backend
npm run kill-port
```

---

## ✅ Verification

### **Check Server Status**:

```bash
curl http://localhost:5000/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "uptime": <seconds>,
    "env": "development"
  }
}
```

### **Check Port Status**:

```bash
netstat -ano | findstr :5000
```

**If server is running**: You'll see `LISTENING` status
**If port is free**: No output

---

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server (with auto port cleanup) |
| `npm run dev` | Start development server (with auto port cleanup) |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run kill-port` | Manually kill port 5000 |
| `npm run clean` | Remove dist folder |

---

## 🔧 How It Works

### **Automatic Port Cleanup**

When you run `npm start` or `npm run dev`:

1. **prestart/predev hook runs** → Executes `kill-port.ps1`
2. **Script checks port 5000** → Finds any process using it
3. **Kills the process** → Frees the port
4. **Waits 2 seconds** → Ensures cleanup completes
5. **Starts server** → Server starts successfully

### **Script Location**

- `backend/scripts/kill-port.ps1` - PowerShell script (Windows)
- `backend/scripts/kill-port.bat` - Batch script (Windows)

---

## ⚠️ Troubleshooting

### **Issue: PowerShell Execution Policy Error**

**Error**: `Execution policy prevents running scripts`

**Fix**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue: Port Still in Use**

**Manual Fix**:
```bash
# Find process
netstat -ano | findstr :5000

# Kill process (replace <PID> with actual number)
taskkill /F /PID <PID>
```

### **Issue: Script Not Found**

**Check**:
- Make sure you're in `backend` directory
- Verify `scripts/kill-port.ps1` exists

---

## ✅ Success Indicators

When server starts successfully, you'll see:

```
Checking for processes on port 5000...
Port 5000 is already free
✅ Route loaded: /api/admin
✅ Route loaded: /api/auth
✅ Route loaded: /api/cart
✅ Route loaded: /api/orders-transaction
✅ Route loaded: /api/orders
✅ Route loaded: /api/otp
✅ Route loaded: /api/products
✅ Route loaded: /api/users
✅ Route loaded: /api/variants

╔══════════════════════════════════════════════════╗
║      🚀 MonsterMen90 Backend Server 🚀           ║
║                                                  ║
║  ✅ Server running on port 5000                 ║
║  ✅ Environment: development                    ║
╚══════════════════════════════════════════════════╝
```

---

**Last Updated**: 2026-01-24
**Status**: ✅ Permanent Fix Implemented & Tested
