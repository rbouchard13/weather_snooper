var obsStations = [];
var lat;
var lng;
var markers = [];
mapboxgl.accessToken = 'pk.eyJ1IjoidGhlZGFkYXMxMzEzIiwiYSI6ImNrdXNrOXdwbTB3M2Uybm82d2V1bXljbjgifQ.Qk2kDT-hQODQFqGghcr4lQ';
function loadMap() {
	var element = document.getElementById('map');
	map = new mapboxgl.Map({
  		container: 'map',
  		style: 'mapbox://styles/mapbox/satellite-v9',
		center: [-98.35, 39.5],
  		zoom: 4,
	});
	getLocation();
}
function getLocation() {
  	if (navigator.geolocation) {
    		navigator.geolocation.getCurrentPosition(getUserPosition);
  	} else {
    		alert("Geolocation is not supported by this browser.");
  	}
}

function getUserPosition(position) {
	lat = position.coords.latitude;
	lng = position.coords.longitude;
	loadXMLDoc();
}

async function loadXMLDoc() {
  	var xhttp = new XMLHttpRequest();
  	xhttp.onreadystatechange = function() {
    	if (this.readyState == 4 && this.status == 200) {
		xmlParse(this);
    		}
  	};
  	xhttp.open("GET", "https://w1.weather.gov/xml/current_obs/index.xml", true);
  	xhttp.send();
	getForecast(lat,lng);
	showPosition(lat,lng);
}

async function getForecast(lat,lng) {
	var response = await fetch('https://api.weather.gov/points/' + lat + ',' + lng + '');
	var grid = await response.json(); 
	forecastUrl = grid.properties.forecast;
	var response = await fetch(forecastUrl);
	var forecast = await response.json(); console.log(forecast);
	let strForecast = loadForecast(forecast);
	document.getElementById("svnDay").innerHTML = strForecast;
}

async function showPosition(lat,lng) {
	var marker = new mapboxgl.Marker({
		color: "#18fc03"
	})

.setLngLat([0, 0])
.addTo(map);
	marker.setLngLat([lng, lat]);
	marker.addTo(map);
	markers.push(marker);
	map.flyTo({
		center: [lng, lat],
		zoom: 13,
		essential: true
	});
	var response = await fetch('https://api.weather.gov/alerts/active?point=' + lat + ',' + lng + '');
	var alerts = await response.json(); console.log(alerts);
	if (alerts.features.length > 0) {alertsPresent(marker, alerts)};
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
	var current = await response.json(); console.log(current);
	addWeather(current);
	document.getElementById("station").innerHTML = obsStations[0].name;	
}

function addWeather(current) {
	document.getElementById("currIcon").innerHTML = "<center><img src='" + current.properties.icon + "' style='width: 30%; border-radius: 15%;'></center>";
	document.getElementById("currDetail").innerHTML = "<center>" + current.properties.textDescription + "</center>"; 
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
	forecastDay();
}

function loadForecast(forecast) {
	let str = "";
	for (i = 0; i <= 13; i++) {
		if(str === '') {
			str = "<div class='row' style='margin: 10px;'><hr>" + forecast.properties.periods[i].name + "</div>" + 
				"<div class='row'><div class='col'><img src='" + forecast.properties.periods[i].icon +"' style='width: 65%; border-radius: 10%;'></div>" +
				"<div class='col'>" + forecast.properties.periods[i].detailedForecast + "</div></div>";}
		else {
			str += "<div class='row' style='margin: 10px;'><hr>" + forecast.properties.periods[i].name + "</div>" + 
				"<div class='row'><div class='col'><img src='" + forecast.properties.periods[i].icon +"' style='width: 65%; border-radius: 10%;'></div>" +
				"<div class='col'>" + forecast.properties.periods[i].detailedForecast + "</div></div>";}
	};
	return str; 
}

async function zipSearch() {
	let zipCd = document.getElementById("zipsearch").value;
	if (zipCd === "") {getLocation();
		markers.forEach((item) => {item.remove();});
		markers = [];
		obsStations = []; 		
		return;
	}
	url = 'https://api.openweathermap.org/data/2.5/weather?zip=' + zipCd + '&appid=e40d95c703aed46604f8e84a0b8291c6';
	var response = await fetch(url);
	var data = await response.json();
	lat = data.coord.lat; lng = data.coord.lon;
	markers.forEach((item) => {item.remove();});
	markers = [];
	obsStations = [];
	loadXMLDoc();
}

function forecastDay() {
	var d= new Date();
	d.setDate(d.getDate());
	let text = d.toString();
	var dtArr = text.split(" ");
	let fDay = dtArr[0] + " " + dtArr[1] + " " + dtArr[2] + " " + dtArr[3];
	//document.getElementById("timeStamp").innerHTML = "Time: " + dtArr[4] + "";
	return fDay; 
}

function alertsPresent(marker, alerts){
	for (let i = 0; i < alerts.features.length; i++) {
		var activeAlerts = "<hr>" + alerts.features[i].properties.description;
	}
	activeAlerts = "<center><Strong>Active Alerts for Your Area</strong></center>" + activeAlerts;
      	let markerElement = marker.getElement();
      	markerElement
		.querySelectorAll('svg g[fill="' + marker._color + '"]')[0]
		.setAttribute("fill", "#e31009");      
      	marker._color = "#e31009";
	var popup = new mapboxgl.Popup({
		offset: 25,
		id: popup})
		.setHTML(activeAlerts);
	marker.setPopup(popup);
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

function openNav() {
	let curWidth = document.getElementById("curdetails").offsetWidth + 100;
  	document.getElementById("mySidenav").style.width = curWidth + "px";
}

function closeNav() {
  	document.getElementById("mySidenav").style.width = "0";
}

window.onload = loadMap();
setInterval(loadXMLDoc, 300000);
