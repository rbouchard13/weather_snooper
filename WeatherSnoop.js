var obsStations = [];
var lat;
var lng;
var markers = [];
var activeAlerts;
var getRad;
var radTiles = [];
var eTime;
var refresh = true;

mapboxgl.accessToken = 'pk.eyJ1IjoidGhlZGFkYXMxMzEzIiwiYSI6ImNrdXNrOXdwbTB3M2Uybm82d2V1bXljbjgifQ.Qk2kDT-hQODQFqGghcr4lQ';
const bounds = [
	[-178.8217, -1.3092],
	[-34.1789, 65.7688]
];

const geocoder = new MapboxGeocoder({
	accessToken: mapboxgl.accessToken,
	types: 'country,region,place,postcode,locality,neighborhood'
	});
	geocoder.addTo('#geocoder');
 
geocoder.on('result', (e) => {let geo = e.result;
	lng = geo.geometry.coordinates[0];
	lat = geo.geometry.coordinates[1];
	markers.forEach((item) => {item.remove();});
	markers = [];
	obsStations = [];
	refresh = true;
	loadXMLDoc();
});

geocoder.on('clear', () => {
	getLocation();
	markers.forEach((item) => {item.remove();});
	markers = [];
	obsStations = []; 
});

function loadMap() {
	var element = document.getElementById('map');
	map = new mapboxgl.Map({
  		container: 'map',
  		style: 'mapbox://styles/mapbox/satellite-v9',
		center: [-98.35, 39.5],
  		zoom: 4,
		//maxBounds: bounds
	});
	getRadar();
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition((pos) => {
			lat = pos.coords.latitude;
			lng = pos.coords.longitude;
			loadXMLDoc();
			logUse(lng,lat);
		})
	} else {
			alert("Geolocation is not supported by this browser.");
	}	
}

async function logUse(lng,lat) {
	let getIP = await fetch("https://api.ipify.org/?format=json");
	let ip = await getIP.json();
	console.log(ip.ip);
	var getGeo = await fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/' + lng + ',' + lat + '.json?types=address&limit=1&access_token=' + mapboxgl.accessToken +''); 
	/*var geoResp = await getGeo.json(); let address = geoResp.features[0].place_name*/
	var response = await fetch('https://api.13media13.com/weathersnooper/access/' + ip.ip)
	var logUpdate = await response.json();
	console.log(logUpdate);
	//var response = await fetch('http://localhost:5000/weathersnooper/access/' + address)		
}

function toggleForecast(period) {
	if (period === "close") {
		document.getElementById("forecastWrapper").style.display = "none";
		return;
	}
	document.getElementById("forecastWrapper").style.display = "block";
	if (period === "week") {
		document.getElementById("forecastPeriod").innerText = "7 Day Forecast";
		document.getElementById("svnDay").style.display = "block";
		document.getElementById("hourly").style.display = "none";
	} else {
		document.getElementById("forecastPeriod").innerText = "Hourly Forecast";
		document.getElementById("svnDay").style.display = "none";
		document.getElementById("hourly").style.display = "block";
	}
}

async function getLocal() {
	obsStations = []
	var test = await fetch('./data.json');
	var test2 = await test.json();
	for (let i = 0; i < test2.length; i++) {
		let lat2 = test2[i].latitude
		let lng2 = "" + test2[i].longitude + "";
		let dist = distance(lat, lat2, lng, lng2);
		let data = {name: test2[i].icao, lat: lat2, lng: lng2, distance: dist};
		obsStations.push(data);
	}
	obsStations.sort(function (a, b) {
	return a.distance - b.distance;
	console.log(obsStations);
	});
}

async function loadXMLDoc() {
	/*var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
		getLocal()
	  xmlParse(this);
		  }
	};
	xhttp.open("GET", "https://w1.weather.gov/xml/current_obs/index.xml", true);
	xhttp.send();
	;
	obsStations.sort(function (a, b) {
		return a.distance - b.distance
	})*/
	obsStations = []
	var test = await fetch('./data.json');
	var test2 = await test.json();
	for (let i = 0; i < test2.length; i++) {
		let lat2 = test2[i].latitude
		let lng2 = "" + test2[i].longitude + "";
		let dist = distance(lat, lat2, lng, lng2);
		let data = {name: test2[i].icao, lat: lat2, lng: lng2, distance: dist};
		obsStations.push(data);
	}
	obsStations.sort(function (a, b) {
	return a.distance - b.distance;
	console.log(obsStations);
	});
	url = 'https://api.weather.gov/stations/' + obsStations[0].name + '/observations/latest';
	var response = await fetch(url);
	var current = await response.json();
	addWeather(current);
	
  	getForecast(lat,lng);
  	if (refresh) showPosition(lat,lng);
	checkRadar();
	let marker = markers[0];
	var response = await fetch('https://api.weather.gov/alerts/active?point=' + lat + ',' + lng + '');
	alerts = await response.json();
	if (alerts.features.length > 0) {alertsPresent(marker, alerts);
	} else {document.getElementById("alertcontainer").style.display = "none";
		document.getElementById("alertdiv").innerHTML = "";
		let markerElement = marker.getElement();
		markerElement
			.querySelectorAll('svg g[fill="' + marker._color + '"]')[0]
			.setAttribute("fill", "#18fc03");      
		marker._color = "#18fc03";
	}
	refresh = false;
}

async function checkRadar() {
	let lastRad = getRad.radar.past[getRad.radar.past.length - 1].time
	var response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
	getRad = await response.json();
	if (getRad.radar.past[getRad.radar.past.length - 1].time === lastRad) {
		console.log("radar up to date")
	} else {
		console.log("new Radar available")
		map.addLayer({
			id: `radar` + radTiles.length,
			type: "raster",
			paint: {"raster-opacity" : 0},
			source: {
				  type: "raster",
					id: `radar` + radTiles.length,
				  	tiles: [
						getRad.host + getRad.radar.past[getRad.radar.past.length - 1].path + '/512/{z}/{x}/{y}/6/1_1.png'
				  	],
				  	tileSize: 512
			},
			layout: {visibility: "visible"},
			minzoom: 0
		  }); 
		  radTiles.push("radar" + radTiles.length);
		  eTime = new Date(getRad.radar.past[getRad.radar.past.length - 1].time * 1000).toString().split(" ");
		  let radEnd = convertTime(eTime);
		  document.getElementById("radEnd").innerHTML = radEnd;
	}
}

async function getRadar(){
	var response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
	getRad = await response.json();
	var i = 0;
	getRad.radar.past.forEach(item => {
		map.addLayer({
			id: `radar` + i,
			type: "raster",
			paint: {"raster-opacity" : 0},
			source: {
				  type: "raster",
					id: `radar` + i,
				  	tiles: [
						getRad.host + item.path + '/512/{z}/{x}/{y}/6/1_1.png'
				  	],
				  	tileSize: 512
			},
			layout: {visibility: "visible"},
			minzoom: 0
		  }); radTiles.push("radar" + i); i++;		
	})
	i = 0; var p;
	setInterval(() => {
		radTiles.forEach((item) => {
			map.setPaintProperty(item,"raster-opacity",0);
		})
		map.setPaintProperty("radar" + i,"raster-opacity",0.5);
		i++;
		if (i === radTiles.length) i = 0;
	}, 750)
	let stime = new Date(getRad.radar.past[0].time * 1000).toString().split(" ");
	eTime = new Date(getRad.radar.past[getRad.radar.past.length - 1].time * 1000).toString().split(" ");
	const radStart = convertTime(stime);
	let radEnd = convertTime(eTime);
	document.getElementById("radStart").innerHTML = radStart;
	document.getElementById("radEnd").innerHTML = radEnd;
}

function convertTime(timeStamp) {
	let nTime = timeStamp[4].split(":");
	nTime[0] > 11 ? tmPer = "pm" : tmPer = "am";
	if (nTime[0] > 12) {nTime[0] = nTime[0] - 12;}
	let disTime = nTime[0] + ":" + nTime[1];
	return timeStamp[0] + " " + timeStamp[1] + " " + timeStamp[2] + " " + disTime + tmPer;
}

async function getForecast(lat,lng) {
	var response = await fetch('https://api.weather.gov/points/' + lat + ',' + lng + '');
	var grid = await response.json(); 
	forecastUrl = grid.properties.forecast;
	var response = await fetch(forecastUrl);
	var forecast = await response.json();
	if (response.status === 500) {
		document.getElementById("svnDay").innerHTML = "There was an error with the forecast data." +
		" This page automatically updates every five minutes. If you would like your forecast sooner, please refresh your browser session.";
		getForecast(lat,lng); 
		return;
	}
	var hourForecast = await fetch(forecastUrl + "/hourly");
	var hourResponse = await hourForecast.json();
	let strForecast = loadForecast(forecast);
	let hourFrcast = loadHourly(hourResponse);
	document.getElementById("svnDay").innerHTML = strForecast;
	document.getElementById("hourly").innerHTML = hourFrcast;
}

async function showPosition(lat,lng) {
	var marker = new mapboxgl.Marker({
		color: "#18fc03"
	})
	marker.setLngLat([lng, lat]);
	marker.addTo(map);
	markers.push(marker);
	map.flyTo({
		center: [lng, lat],
		zoom: 8,
		essential: true
	});
	refresh = false;
}

async function xmlParse(xml) {	
  	var i;
  	var xmlDoc = xml.responseXML;
  	var x = xmlDoc.getElementsByTagName("station");
  	for (i = 0; i <x.length; i++) {
		let lat2 = x[i].getElementsByTagName("latitude")[0].childNodes[0].nodeValue;
		let lng2 = "" + x[i].getElementsByTagName("longitude")[0].childNodes[0].nodeValue + "";
		let dist = distance(lat, lat2, lng, lng2);
		let data = {name: x[i].getElementsByTagName("station_id")[0].childNodes[0].nodeValue, lat: lat2, lng: lng2, distance: dist};
		obsStations.push(data);
	}
	obsStations.sort(function (a, b) {
		return a.distance - b.distance
	})
	url = 'https://api.weather.gov/stations/' + obsStations[0].name + '/observations/latest';
	var response = await fetch(url);
	var current = await response.json();
	addWeather(current);	
}

function addWeather(current) {
	document.getElementById("station").innerHTML = obsStations[0].name;
	document.getElementById("currIcon").innerHTML = "<img src='" + current.properties.icon + "' style='width: 80px; border: 1px solid black; border-radius: 15px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.7), 0 6px 20px 0 rgba(0, 0, 0, 0.45);' title='" + current.properties.textDescription + "' alt='Image Error'>";
	document.getElementById("currTemp").innerHTML = " " + Math.round((current.properties.temperature.value * 9/5) + 32) + "&#8457";
	document.getElementById("currHumid").innerHTML = " " + Math.round(current.properties.relativeHumidity.value) + "&#37";
	document.getElementById("currDew").innerHTML = "    " + Math.round((current.properties.dewpoint.value * 9/5) + 32) + "&#8457";
    	var val = Math.floor((current.properties.windDirection.value / 22.5) + 0.5);
    	var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
   	let windD = arr[(val % 16)];
	document.getElementById("currWind").innerHTML = " " + windD + " at " + Math.round(current.properties.windSpeed.value / 1.609) + " mph" ;
	let pressure = (current.properties.barometricPressure.value / 100) * .0295301;
	pressure = pressure.toFixed(2);
	document.getElementById("currPressure").innerHTML = " " + pressure + "in";
	/*if (current.properties.heatIndex.value !== null) {
		let realfeel = Math.round((current.properties.heatIndex.value * 9/5) + 32);
		document.getElementById("feelslike").innerHTML = "Feels Like:<span style='margin-left:5px;'>" + realfeel + "&#8457</span>"; 
		return;}
	else if (current.properties.windChill.value !== null) {
		let realfeel = Math.round((current.properties.windChill.value * 9/5) + 32);
		document.getElementById("feels").innerHTML = "Feels Like:<span style='margin-left: 5px;'>" + realfeel + "&#8457</span>"; 
		return;}
	else {
		document.getElementById("feels").innerHTML = ""}*/
}

function loadForecast(forecast) {
	let str = "";
	for (i = 0; i <= 13; i++) {
		if(str === '') {
			str = "<div class='row'><strong><u>" + forecast.properties.periods[i].name + "</u></strong></div>" + 
				"<div class='row'><center><img src='" + forecast.properties.periods[i].icon +"' style='width: 65px; border-radius: 10%;border: 1px solid black; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.7), 0 6px 20px 0 rgba(0, 0, 0, 0.45);'></center></div>" +
				"<div class='row'>" + forecast.properties.periods[i].detailedForecast + "</div>";}
		else {
			str += "<div class='row'><strong><u>" + forecast.properties.periods[i].name + "</u></strong></div>" + 
				"<div class='row'><center><img src='" + forecast.properties.periods[i].icon +"' style='width: 65px; border-radius: 10%;border: 1px solid black; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.7), 0 6px 20px 0 rgba(0, 0, 0, 0.45);'></center></div>" +
				"<div class='row'>" + forecast.properties.periods[i].detailedForecast + "</div>";}
	};
	return str; 
}

function loadHourly(forecast) {
	let str = "";
	for (i = 0; i <= 13; i++) {
		let timePeriod;
		let newTime;
		let date = new Date(forecast.properties.periods[i].startTime).toString().split(" ");
		let time = date[4].split(":");
		if (time[0] > 11) {
			timePeriod = "PM"
			if (time[0] > 12 ) {
				newTime = Number(time[0]) - 12;
			} else {
				newTime = Number(12);
			}
		} else {
			timePeriod = "AM";
			newTime = Number(time[0]);
			if (newTime === 00) {
				newTime = Number(12);
			}
		}
		let period = "<strong><u>" + date[0] + " " + date[1] + " " + date[2] + " " + date[3] + "</u><br>" + newTime  + " " + timePeriod + "</strong>";
		if(str === '') {
			str = "<div class='row'>" + period + "</div>" + 
				"<div class='row'><center><img src='" + forecast.properties.periods[i].icon +"' style='width: 65px; border-radius: 10%;border: 1px solid black; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.7), 0 6px 20px 0 rgba(0, 0, 0, 0.45);'></center></div>" +
				"<div class='row'>" + forecast.properties.periods[i].shortForecast + ". Temperature " + forecast.properties.periods[i].temperature + ". Winds " + forecast.properties.periods[i].windDirection + " at " + forecast.properties.periods[i].windSpeed + ".</div>";}
		else {
			str += "<div class='row'>" + period + "</div>" +  
				"<div class='row'><center><img src='" + forecast.properties.periods[i].icon +"' style='width: 65px; border-radius: 10%;border: 1px solid black; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.7), 0 6px 20px 0 rgba(0, 0, 0, 0.45);'></center></div>" +
				"<div class='row'>" + forecast.properties.periods[i].shortForecast + ". Temperature " + forecast.properties.periods[i].temperature + ". Winds " + forecast.properties.periods[i].windDirection + " at " + forecast.properties.periods[i].windSpeed + ".</div>";}
	};
	return str; 
}

function alertsPresent(marker, alerts){
	for (let i = 0; i < alerts.features.length; i++) {
		activeAlerts = alerts.features[i].properties.description;
	}
      	let markerElement = marker.getElement();
      	markerElement
		.querySelectorAll('svg g[fill="' + marker._color + '"]')[0]
		.setAttribute("fill", "#ff1a1a");      
      	marker._color = "#ff1a1a";
	var newA = activeAlerts.replace(/\n/g, " ");
	if (document.getElementById("alertModal").innerHTML === newA) return;
	document.getElementById("alertcontainer").style.display = "block";
	document.getElementById("alertdiv").innerHTML = "<marquee behavior='scroll' direction='left' style='color: white; font-family: 'Times New Roman', Times, serif;'>" + newA + "</marquee>"
	document.getElementById("alertModal").innerHTML = newA;
}

function distance(lat, lat2, lng, lng2) {
	lng = lng * Math.PI / 180;
	lng2 = lng2 * Math.PI / 180;
	lat = lat * Math.PI / 180;
	lat2 = lat2 * Math.PI / 180;
	let dlon = lng2 - lng;
	let dlat = lat2 - lat;
	let a = Math.pow(Math.sin(dlat / 2), 2)
		+ Math.cos(lat) * Math.cos(lat2)
		* Math.pow(Math.sin(dlon / 2),2);			
	let c = 2 * Math.asin(Math.sqrt(a));
	let r = 3956;
	return(c * r);
}

function newLoc(event) {
		refresh = true;
		let loc = JSON.parse(JSON.stringify(event.lngLat));
		let xlat = loc.lat - lat; xlat = xlat.toFixed(4);
		let xlng = loc.lng - lng; xlng = xlng.toFixed(4);
		var msg = confirm("You are about to move to a new location. Are you sure you want to?")
		if (msg === true) {
		lat = loc.lat;
		lng = loc.lng;
		markers.forEach((item) => {item.remove();});
		markers = [];
		obsStations = [];
		loadXMLDoc();
	} else {
		return;
	}
}

function showModal(section) {
	if (section === "about") {
		let modal = document.getElementById("aboutMod");
		modal.style.display = "block";
	} else if (section === "alert") {
		let modal = document.getElementById("alertMod");

		modal.style.display = "block";
	}
}

function closeModal(section) {
	if (section === "about") {
		let modal = document.getElementById("aboutMod");
		modal.style.display = "none";
	} else if (section === "alert") {
		let modal = document.getElementById("alertMod");
		modal.style.display = "none";
	}
}

window.onclick = function(event) {
	let modal1 = document.getElementById("aboutMod");
  	if (event.target == modal1) {
    		modal1.style.display = "none";
  	}
	let modal2 = document.getElementById("alertMod");
  	if (event.target == modal2) {
    		modal2.style.display = "none";
  	}
}

window.onload = loadMap();
map.on('click', newLoc); 
setInterval(loadXMLDoc, 30000);
