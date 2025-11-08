@echo off
echo Starting GMShoot SOTA Analysis...
cd /d "C:\Users\shova\Downloads\GMShoot\gmshooter-v2"
call venv_py311\Scripts\activate
streamlit run src/ui_layer/app.py
pause