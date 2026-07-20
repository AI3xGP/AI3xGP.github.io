+++
date = '2026-01-08T07:51:46-05:00'
draft = false
title = 'Jira'
+++


During the handling of an incident, it became necessary to conduct an audit in Jira to verify whether any private key or digital certificate had been shared through a ticket.

To accomplish this, a comprehensive system-wide search was performed. Using a user account with sufficient privileges to execute global searches, the following script was developed:

```c
import requests
import json
import csv
from requests.auth import HTTPBasicAuth

url = "https://direccionjira/rest/api/2/search"
auth = HTTPBasicAuth("usuario", "password")

def hunting(tipo_busqueda, busqueda):
    
    headers = {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }

    payload = json.dumps( {
      "jql": "text ~ '"+ busqueda  +"'",
      "maxResults": 15,
      "startAt": 0
    } )

    response = requests.request(
      "POST",
      url,
      data=payload,
      headers=headers,
      auth=auth
    )
  
    print(response.content)

    #json_data = json.loads(response.text)

    #print(json.dumps(json_data, indent=4))

    #totalResultados = json_data.get("total")

    #print("***************************Results: " + str(totalResultados) + "*******************************************")

    #issues = json_data.get("issues")

    #for i in range(totalResultados):
        #try:
          #print("\n-------------------------- Sensitive information in the project: : " + str(issues[i]["fields"]["project"]["name"]) + "---------------------------------------------- \n")
          #print("Issue: " + issues[i]["self"])
          #print("Type of finding: " + tipo_busqueda)
          #print("Finding: " + busqueda)

          #print (str(issues[i]["fields"]["project"]["name"]) + "|" + issues[i]["self"] + "|" + tipo_busqueda + "|" + busqueda)
        #except Exception as e:
          #print(e)
          #None

hunting("CERTIFICATE", "BEGIN_CERTIFICATE")

archivo_csv = "busqueda.txt"
```
