import sys
import os

# 🛑 1. EL BOZAL A FIREBASE (Debe ir MÁS ARRIBA que la importación de 'app')
# Esto le prohíbe a Google/Firebase crear los 15 hilos invisibles que te consumen la RAM
os.environ["GRPC_DNS_RESOLVER"] = "native"
os.environ["GRPC_PYTHON_DISABLE_CONCURRENT_CHANNEL_CREATION"] = "1"
os.environ["GRPC_ENABLE_FORK_SUPPORT"] = "0"
os.environ["GRPC_POLL_STRATEGY"] = "epoll1"

# 2. Agregar la ruta de tu app (lo que ya tenías)
sys.path.insert(0, os.path.dirname(__file__))

# 3. Arrancar la aplicación Flask (Aquí es donde Firebase despierta, pero ya con el bozal puesto)
from app import app as application