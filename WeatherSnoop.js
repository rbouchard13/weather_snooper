var lat;
var lng;
var url;
mapboxgl.accessToken = 'pk.eyJ1IjoidGhlZGFkYXMxMzEzIiwiYSI6ImNrdXNrOXdwbTB3M2Uybm82d2V1bXljbjgifQ.Qk2kDT-hQODQFqGghcr4lQ';
function getLocation() {
  	if (navigator.geolocation) {
    		navigator.geolocation.getCurrentPosition(showPosition);
  	} else {
    		alert("Geolocation is not supported by this browser.");
  	}
}

async function showPosition(position) {
	lat = position.coords.latitude;
	lng = position.coords.longitude;	
	var element = document.getElementById('map');
	map = new mapboxgl.Map({
  		container: 'map',
  		style: 'mapbox://styles/mapbox/satellite-v9',
		center: [lng, lat],
  		zoom: 10,
	});
	url = 'https://api.openweathermap.org/data/2.5/onecall?lat=' + lat + '&lon=' + lng + '&units=imperial&appid=e40d95c703aed46604f8e84a0b8291c6';
	var response = await fetch(url);
	var data = await response.json();
	console.log(data);
		document.getElementById("currIcon").innerHTML = "<img src='http://openweathermap.org/img/wn/" + data.current.weather[0].icon + ".png' style='width: 20%;'>";
		//document.getElementById("currDetail").innerHTML = "test" //+ data.current.weather[0].description + ""; 
		document.getElementById("currTemp").innerHTML = "" + Math.round(data.current.temp) + "&#8457";
		document.getElementById("realFeel").innerHTML = "" + Math.round(data.current.feels_like) + "&#8457";
		document.getElementById("currHumid").innerHTML = "" + data.current.humidity + "&#37";
		document.getElementById("currDew").innerHTML = "" + Math.round(data.current.dew_point)  + "&#8457";
		document.getElementById("currWind").innerHTML = "" + Math.round(data.current.wind_speed) + " mph";
		let num = (data.current.pressure * .0295301);
		let bp = num.toFixed(2);
		document.getElementById("currPressure").innerHTML = "" + bp + "in";
		var marker = new mapboxgl.Marker({
			color: "#18fc03"
		})
		marker.setLngLat([lng, lat]);
			if (data.alerts){alertsPresent(marker, data);}
		marker.addTo(map);
		let strForecast = getForecast(data);
		document.getElementById("svnDay").innerHTML = "<center>" + strForecast + "</center>";
}

function getForecast(data) {
	let str = "";
	for (i = 1; i <= 7; i++) {
		if(str === '') {
			str = "Your 7 Day Forecast<div><img src='http://openweathermap.org/img/wn/" + data.daily[i].weather[0].icon + ".png' style='width: 25%;' title='High: " + Math.round(data.daily[i].temp.max) + " Real Feel: " + Math.round(data.daily[i].feels_like.day) +
				"&#013 Low: " + Math.round(data.daily[i].temp.min) + "'></div>";}
		else {
			str += "<div><img src='http://openweathermap.org/img/wn/" + data.daily[i].weather[0].icon + ".png' style='width: 25%;' title='High: " + Math.round(data.daily[i].temp.max) + " Real Feel: " + Math.round(data.daily[i].feels_like.day) +
				"&#013 Low: " + Math.round(data.daily[i].temp.min) + "'></div>";}	
	};
	return str; 
}

function alertsPresent(marker, data){
      	let markerElement = marker.getElement();
      	markerElement
		.querySelectorAll('svg g[fill="' + marker._color + '"]')[0]
		.setAttribute("fill", "#e31009");      
      	marker._color = "#e31009";
	var popup = new mapboxgl.Popup({
		offset: 25,
		id: popup})
		.setHTML("<strong>Alerts: " + data.alerts[0].description + "</strong>");
	marker.setPopup(popup);
}

async function showForecast() {
	openNav();
}

function openNav() {
	let curWidth = document.getElementById("curdetails").offsetWidth + 100;
  	document.getElementById("mySidenav").style.width = curWidth + "px";
}

function closeNav() {
  	document.getElementById("mySidenav").style.width = "0";
}


window.onload = getLocation;
