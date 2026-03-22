@echo off
cd /d "%~dp0"
pip install flask flask-cors gunicorn
python app.py
pause
