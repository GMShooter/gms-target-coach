#!/bin/bash

echo "Starting GMShoot SOTA Analysis..."
cd "$(dirname "$0")"
streamlit run src/ui_layer/app.py