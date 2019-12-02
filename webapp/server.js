const express = require('express'); 
const cors = require('cors'); 

const app = express(); 

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}

const config = require('./app/config/config');

var routes = require('./app/v01/routes/index.routes');

app.use(cors(corsOptions)); 

app.use('/', express.static('frontend/dist'));

var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

testData = [
    {
      "id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
      "entities": [
        {
            "start": 40,
            "end": 49,
            "tag": "Diagnose",
            "tag_id": "d7caa59c-b734-40bc-a24d-b770298b4e2d",
            "created_at": "2019-10-28T06:25:10.607584+00:00",
            "example_id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
            "value": "Meningeom"
        },
        {
            "end": 64,
            "tag": "ICD",
            "start": 57,
            "tag_id": "d7caa59c-b734-40bc-a24d-b770298b4e2d",
            "created_at": "2019-10-28T06:25:10.607748+00:00",
            "example_id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
            "value": "D32.9LG"
          },
        {
          "end": 85,
          "tag": "Diagnose",
          "start": 67,
          "tag_id": "d7caa59c-b734-40bc-a24d-b770298b4e2d",
          "created_at": "2019-10-28T06:25:10.607715+00:00",
          "example_id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
          "value": "Gesichtsfelddefekt"
        },
        
        {
          "end": 92,
          "tag": "ICD",
          "start": 86,
          "tag_id": "9fbb725a-4521-4f36-b064-54c2b4bec509",
          "created_at": "2019-10-28T06:25:10.607813+00:00",
          "example_id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
          "value": "H53.4G"
        },
        {
          "end": 248,
          "tag": "Medikation",
          "start": 240,
          "tag_id": "dc94c99c-60cd-43d0-81ce-baef617c7f86",
          "created_at": "2019-10-28T06:25:10.607677+00:00",
          "example_id": "202739aa-5dad-418c-9a33-0e02e0b16a35",
          "value": "Novalgin"
        }
      ],
      "metadata": {
        "id": 1,
        "chapter": 1,
        "verse": 2,
        "tableData": {
          "id": 1
        }
      },
      "last_update": "2019-10-28T06:25:10.607813Z",
      "content": "Sehr geehrte Frau Kollegin, Diagnosen: Meningeom links {D32.9LG} ,Gesichtsfelddefekt{H53.4G} Anamnese: 17.7.19: Meningeom bestehe weiterhin, rez. bestrahlt, zuletzt vor 9 Monaten, habe fragliches Ödem/Tumorrest.Nähme bei KS gelegentliches Novalgin.Im August MRT-Kontrolle.Ab und an Farbsehphänomene im Auge, es soll ein EEG gemacht werden. Diagnostische Maßnahmen:EEG: regelrechtes gut ausgebildetes alpha-EEG mit 9 Hz, regelrechte visuelle Blockierung und Reaktivierung. Kein Herd, keine epilepsietypischen Potentiale. Beurteilung und Zusammenfassung: Das Routine-EEG zeigte einen Normalbefund an, die Weiterbehandlung erfolgt im Gamma-Knife-Zentrum. Mit kollegialen Grüßen"
    }
  ]; 

  var pdfData = [
      {
          "page" : 1, 
          "entities" : [
              {
                  "pos" : {
                      "x1" : 20, 
                    "x2" : 100, 
                    "y1" : 50, 
                    "y2" : 200
                  },
                  "value" : "harald", 
                  "tag" : "Medikation"
              },
              {
                "pos" : {
                    "x1" : 60, 
                    "x2" : 180, 
                    "y1" : 180, 
                    "y2" : 280
                },
                "value" : "Medi2", 
                "tag" : "Diagnose"
            },
          ]
      }
  ]

  app.route('/api/v01/data').get((req, res) => {
      console.log("Called...")
      res.send(testData)
  })

  app.route('/api/v01/process/file').get((req, res) => {
      console.log("PDF Called...")
      res.send(pdfData)
  }); 

  app.use('/api/v' + config.APIVersion, routes);



  app.listen(8000, () => {
    console.log('Server started!')
  })