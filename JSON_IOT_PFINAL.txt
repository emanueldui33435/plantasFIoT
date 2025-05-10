import network
import time
from umqtt.simple import MQTTClient
import dht
import ujson
from machine import Pin, ADC, PWM

# Pines
sensor_dht = dht.DHT11(Pin(14))     # D5
soil_moisture = ADC(0)              # A0 
aspersor = Pin(12, Pin.OUT)         # D6
servo = PWM(Pin(13), freq=50)       # D7
servo_guardado = False

# Variables de configuración recibidas por MQTT
plant_config = {}

# Conexión WiFi
def connect_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    while not wlan.isconnected():
        time.sleep(1)
    print("Conectado a WiFi:", wlan.ifconfig())

# Callback MQTT
def sub_cb(topic, msg):
    global plant_config
    topic = topic.decode()
    msg = msg.decode()
    print("Mensaje recibido:", topic, msg)

    if topic == "terrario/planta":
        try:
            plant_config = ujson.loads(msg)
            print("Configuración de planta actualizada:", plant_config)
        except Exception as e:
            print("Error al decodificar configuración:", e)

# Conexión MQTT
connect_wifi('PONK_WIFI', 'Pepe2405')
client = MQTTClient("terrario_esp", "192.168.206.1")
client.set_callback(sub_cb)
client.connect()
client.subscribe(b"terrario/planta")

# Función para leer humedad del suelo
def leer_humedad_suelo():
    valor = soil_moisture.read()
    humedad = 100 - int(valor / 1023 * 100)
    return humedad

# Función para leer LDR (si decides usarlo)
def leer_luz():
    valor = soil_moisture.read()  # usar multiplexor si LDR y humedad comp	arten A0
    luz = int(valor / 1023 * 100)
    return luz

while True:
    try:
        sensor_dht.measure()
        temp = sensor_dht.temperature()
        hum_amb = sensor_dht.humidity()
        hum_suelo = leer_humedad_suelo()
        luz = leer_luz()

        print("Temp:", temp, "Humedad Aire:", hum_amb, "Humedad Suelo:", hum_suelo, "Luz:", luz)

        data = {
            "temp": temp,
            "hum_amb": hum_amb,
            "hum_suelo": hum_suelo,
            "luz": luz
        }
        client.publish(b"terrario/data/lecturas", ujson.dumps(data))

        # --- Activar aspersor si no se cumplen condiciones óptimas ---
        if plant_config:
            if (temp > plant_config.get("temp_ambiente_max", 999) and
                hum_amb < plant_config.get("humedad_ambiente_min", 0) and
                hum_suelo < plant_config.get("humedad_suelo_min", 0)):
                aspersor.on()
                client.publish(b"terrario/state/aspersor", b"ON")
            else:
                aspersor.off()
                client.publish(b"terrario/state/aspersor", b"OFF")

            # --- Control de malla por luz ---
            if luz > 70 and not servo_guardado:
                print("Demasiada luz, desplegando malla")
                servo.duty(120)
                servo_guardado = True
                client.publish(b"terrario/state/servo", b"DEPLOY")
            elif luz <= 70 and servo_guardado:
                print("Poca luz, replegando malla")
                servo.duty(40)
                servo_guardado = False
                client.publish(b"terrario/state/servo", b"RETRACT")

        client.check_msg()
        time.sleep(5)

    except Exception as e:
        print("Error:", e)
        time.sleep(5)
