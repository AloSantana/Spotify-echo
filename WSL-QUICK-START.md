# EchoTune AI - WSL Quick Start

## 🚀 One-Command Setup

### From WSL Ubuntu Terminal:

```bash
git clone https://github.com/primoscope/Spotify-echo.git
cd Spotify-echo
chmod +x setup-wsl.sh
./setup-wsl.sh
```

### From Windows Command Prompt:

1. Clone the repository (in your desired Windows location)
2. Double-click `setup-wsl.bat`

## ⚡ Quick Commands

```bash
# Start development server
npm run dev

# Start production server  
npm start

# Run tests
npm test

# Check logs
tail -f logs/app.log
```

## 🔧 Service Management

```bash
# Start services
sudo systemctl start mongod redis-server

# Stop services
sudo systemctl stop mongod redis-server

# Check status
sudo systemctl status mongod redis-server
```

## 🌐 Access Application

From Windows Browser:
- **Main App**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api/docs

## 📝 Environment Setup

Edit `.env` file:

```bash
nano .env
```

Required variables:
```env
JWT_SECRET=your-secret-key
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-secret
```

Get Spotify credentials: https://developer.spotify.com

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process
sudo lsof -i :3000
kill -9 <PID>
```

### MongoDB Not Running
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

### Module Not Found
```bash
npm install
```

### Permission Denied
```bash
sudo chown -R $USER:$USER ~/Spotify-echo
```

## 📚 Full Documentation

- **Complete WSL Guide**: `SETUP-WSL.md`
- **General Setup**: `SETUP.md`
- **Main Documentation**: `README.md`

## 💡 Pro Tips

1. **File System Performance**: Keep project in WSL (`~/Spotify-echo`), not Windows (`/mnt/c/...`)

2. **VS Code Integration**:
   ```bash
   code .  # Opens project in VS Code with WSL extension
   ```

3. **Auto-start Services**:
   ```bash
   # Services auto-start on boot if enabled
   sudo systemctl enable mongod redis-server
   ```

4. **Resource Limits**: Edit `%UserProfile%\.wslconfig`:
   ```ini
   [wsl2]
   memory=8GB
   processors=4
   ```

## 🆘 Getting Help

- GitHub Issues: https://github.com/primoscope/Spotify-echo/issues
- Check `SETUP-WSL.md` for detailed troubleshooting
- Review logs in `/tmp/echotune-test.log`

---

**Need full setup instructions?** See `SETUP-WSL.md`
