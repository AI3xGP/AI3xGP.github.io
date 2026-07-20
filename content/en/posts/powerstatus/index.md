+++
date = '2025-12-30T08:29:59-05:00'
draft = false
title = 'Powerstatus'
+++

Today, in Scripts to Work Less, I wanted to explore the idea of creating a small script to determine a machine’s startup, shutdown, and wake-up times.

In the case of Windows, I know this information can already be obtained using tools like Plaso and others. However, I don’t want to spend 30 minutes just to answer a very specific question. So, let’s get our hands dirty. The first step is to identify which system events are related to these activities.

Event ID 6005 – EventLog

    - Description: “The Event Log service was started”
    - Interpretation: The system has started (boot).

Event ID 12 – Kernel-General

    - Description: “The operating system started at system time…”
    - Interpretation: System startup at the kernel level.

Event ID 1 – Kernel-General

    - Description: System services initialization.
    - Usage: Early startup context.

Event ID 6006 – EventLog

    - Description: “The Event Log service was stopped”
    - Interpretation: Clean system shutdown.

Event ID 1074 – User32

    - Description: Shutdown or restart initiated by:
        - User
        - Process
        - Windows Update

    Includes:

        - User
        - Executing process
        - Type (shutdown / restart)

Event ID 13 – Kernel-General

    - Description: The system is shutting down.
    - Kernel-level event, lower-level than 1074.

Event ID 41 – Kernel-Power

    - Description: “The system has rebooted without cleanly shutting down first”

    - Interpretation:

        - Power outage
        - Forced reset
        - BSOD

Event ID 6008 – EventLog

    - Description: “The previous system shutdown was unexpected”
    - Complements Event ID 41.

Event ID 42 – Kernel-Power

    - Description: The system is entering:
        - Sleep
        - Hibernate

    - Includes: Type of sleep state.


Event ID 1 – Power-Troubleshooter

    - Description: The system resumed from sleep or hibernation.
    - Includes:
       - Device that caused the wake-up
       - Exact timestamp

Event ID 107 – Kernel-Power

    - Description: The system has exited sleep.
    - Usage: Complementary to Power-Troubleshooter.

| Action              | Event ID | Source               |
|---------------------|----------|----------------------|
| Startup             | 6005     | EventLog             |
| Startup             | 12       | Kernel-General       |
| Clean shutdown      | 6006     | EventLog             |
| Initiated shutdown  | 1074     | User32               |
| Kernel shutdown     | 13       | Kernel-General       |
| Unexpected shutdown | 41       | Kernel-Power         |
| Unexpected shutdown | 6008     | EventLog             |
| Suspension          | 42       | Kernel-Power         |
| Resume              | 1        | Power-Troubleshooter |
| Resume              | 107      | Kernel-Power         |


With this information clearly defined, I use the Evtx Python library to parse the data:



```c
import sys
import os
import csv
from Evtx.Evtx import Evtx
import xml.etree.ElementTree as ET

EVENT_MAP = {
    "6005": "ENCENDIDO",
    "6006": "APAGADO",
    "6008": "APAGADO",
    "41":   "APAGADO",
    "1074": "APAGADO",
    "42":   "SUSPENDIDO",
    "1":    "REANUDADO"
}

if len(sys.argv) != 2:
    print("Uso: python3 evtx_power_to_csv.py <directorio_system_evtx>")
    sys.exit(1)

evtx_dir = sys.argv[1]
evtx_path = os.path.join(evtx_dir, "System.evtx")

if not os.path.isfile(evtx_path):
    print(f"Error: no se encontró System.evtx en {evtx_dir}")
    sys.exit(1)

def find_event_id(xml_root):
    for elem in xml_root.iter():
        if elem.tag.endswith("EventID"):
            return elem.text
    return None

def find_time(xml_root):
    for elem in xml_root.iter():
        if elem.tag.endswith("TimeCreated"):
            return elem.attrib.get("SystemTime")
    return None

with Evtx(evtx_path) as log, open("power_events.csv", "w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["fecha", "estado"])

    for record in log.records():
        try:
            xml = ET.fromstring(record.xml())
        except ET.ParseError:
            continue

        event_id = find_event_id(xml)
        if event_id not in EVENT_MAP:
            continue

        time = find_time(xml)
        if not time:
            continue

        writer.writerow([time, EVENT_MAP[event_id]])

print("CSV generado correctamente con encendido, apagado y suspensión: power_events.csv")
```


Github Project:  https://github.com/AI3xGP/SystemStatus

