#!/usr/bin/env node
'use strict'

const logger = require('pino')()

var mqtt = require('mqtt')
var fs = require('fs')
var path = require('path')
const yaml = require("js-yaml")
const { generate_uuid } = require('rhea')
try {
  var cfg = yaml.load(fs.readFileSync(path.resolve(__dirname,"configfile.yml"),"utf-8"));
  logger.info("configfile loaded successfully");
} 
catch (e) {
  logger.info(e);
}

var KEY = fs.readFileSync(path.join(__dirname, cfg.MQTT_keyfile));
var CERT = fs.readFileSync(path.join(__dirname, cfg.MQTT_certfile));
var TRUSTED_CA_LIST = fs.readFileSync(path.join(__dirname, cfg.MQTT_ca_cert));

var PORT = cfg.MQTT_port;
var HOST = cfg.MQTT_URL;
var client = generate_uuid();
var container = require("rhea");
const { send } = require('process')
var connection = container.connect({ 
    port:cfg.AMQP_PORT,
     host:cfg.AMQP_HOST, 
     container_id:client,
     transport:'tls',
     enable_sasl_external:true,
     key: fs.readFileSync(path.resolve(__dirname,cfg.AMQP_keyfile)),
     cert: fs.readFileSync(path.resolve(__dirname,cfg.AMQP_certfile)),
 
     // This is necessary only if the server uses the self-signed certificate
     ca: [ fs.readFileSync(path.resolve(__dirname,cfg.AMQP_ca)) ]});
var sender

connection.on('receiver_open', function (context) {
    logger.info('Subscribed to AMQP');
});

connection.on('message', function (context) { // receive message from Nordic Way interchange
  try
    {
      var message = JSON.parse(context.message.body) // convert body to string
      message.mqtt_topic = 'carChassisNumber/DENM' // say that we are sending a DENM
      message.ix_direction = "recv" // say that this is receiving from IX
      logger.info(message)
      message = JSON.stringify(message) // convert back to string..
      client.publish('carChassisNumber/DENM', message) // publish back to MQTT broker
    }
  catch (error)
    {
      logger.info(error)
    }

});

container.on('sender_open', function (context) {
  logger.info('AMQP1.0 sender open');
});

// the identity of the subscriber is the combination of container id
// and link (i.e. receiver) name
connection.open_receiver({source:{address:cfg.AMQP_source, durable:0, expiry_policy:'session-end'}});
sender = connection.open_sender({target:{address:cfg.AMQP_sink, durable:0, expiry_policy:'session-end'}})

// sender.on("accepted",function(){
//   logger.info("message accepted")
// });
var options = {
  port: PORT,
  host: HOST,
  key: KEY,
  cert: CERT,
  rejectUnauthorized: true,
  // The CA list will be used to determine if server is authorized
  ca: TRUSTED_CA_LIST,
  protocol: 'mqtts'
}

var client = mqtt.connect(options); //connect top MQTT-broker
const Topics_subscribe = cfg.MQTT_Topics.subscribe; // get all subscribetopics from configfile
Topics_subscribe.map(function genSub(value){ // use the map function on array to loop through all fields in array
  client.subscribe(value)  
});

client.on('message', function (topic, message) {
  try{
    const mqtt_logger = logger.child({"mqtt_topic":topic}) //log the topic the message was received on
    message = message.toString() // convert the message to string
    var message = JSON.parse(message) // convert the message to JSON
    message.extra_weight = "" // add field for putting in some extra weight
    message.ix_direction = "send" // add the message direction
    mqtt_logger.info(message) // log the received message
  
  
    var length = JSON.stringify(message).length // find the length of the message
    length = 1000 - length // calculate how much we need to add to get a 1000byte message 
    msg.payload.application_properties.longitude = message.lon
    msg.payload.application_properties.latitude = message.lat
    message.extra_weight = '#'.repeat(length)//makeid(length) // add some extra weight to the message
    msg.payload.body = JSON.stringify(message) // convert the message back to string to send it on interchange
    sender.send(msg.payload) // send payload to nordic way interchange
  }
  catch(error)
  {
    logger.info(error)
  }
});

client.on('connect', function () {
  logger.info('Connected to MQTT-broker')
})


var msg = {payload:{}}
msg.payload.application_properties = {
            "publisherId": "NO00000",
            "originatingCountry": "NO",
            "protocolVersion": "DENM:1.2.2",
            "serviceType": "HLN-AWWD",
            "messageType": "DENM",
            "longitude": 60.0,
            "latitude": 5.0,
            "quadTree": ",1200201331203110230,1200201331203110221,1200201331203110220,1200201331203101331,1200201331203101330,1200201331203101321,1200201331203101303,1200201331203101302,1200201331203101320,120020133120310121,1200201331203101201,1200201331203101200,1200201331203101203,1200201331203100311,1200201331203100310,1200201331203100133,1200201331203100132,1200201331203100123,1200201331203100122,1200201331203100301,120020133120310003,120020133120310002,1200201331203011133,1200201331203011132,1200201331203011311,1200201331203011310,120020133120301130,1200201331203011213,120020133120301123,1200201331203011223,1200201331203011221,1200201331203013001,1200201331203013000,1200201331203013002,1200201331203013020,1200201331203012113,1200201331203012131,1200201331203012133,1200201331203012132,1200201331203012311,1200201331203012310,120020133120301230,1200201331203012312,1200201331203012313,120020133120301232,120020133120301233,120020133120301221,120020133120301223,1200201331203013220,1200201331203013222,120020133120303010,1200201331203030120,120020133120303003,12002013312030302,12002013312030320,12002013312030231,12002013312030233,1200201331203201100,1200201331203201102,1200201331203201120,1200201331203201122,1200201331203201031,1200201331203201033,1200201331203201300,1200201331203201211,1200201331203201213,1200201331203201302,1200201331203201231,1200201331203201233,120020133120320301,120020133120320302,120020133120320303,120020133120320321,120020133120320330,120020133120320312,120020133120320320,120020133120320231,120020133120320322,120020133120320233,",
            "causeCode":"14",
            "subCauseCode":"2"
        }
msg.payload.body = "Heisann verden fra NodeJS"
