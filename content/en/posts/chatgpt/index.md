+++
date = '2026-01-27T10:33:41-05:00'
draft = false
title = 'Chatgpt'
+++


Como analizar extensiones o posibles exfiltraciones a traves de chatgpt, dependiendo de la aplicacion utilizada para conectar, tendremos los datos en uno u otro directorio, para esta publicacion utilizaremos, acceso web a traves de chrome (no varia mucho con firefox o edge)

Lo mas importante es donde encontraremos los artefactos y principalmente estan en tres directorios:

dfindexeddb db -s IndexedDB/https_chatgpt.com_0.indexeddb.leveldb --format chrome --use_manifest > basechatgpt.txt


Herramienta final https://github.com/google/dfindexeddb 

IndexedDB
NetworkDB
SessionsDB
