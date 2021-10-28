var lat;
var lng;
var url;
var markers = [];
mapboxgl.accessToken = 'pk.eyJ1IjoidGhlZGFkYXMxMzEzIiwiYSI6ImNrdXNrOXdwbTB3M2Uybm82d2V1bXljbjgifQ.Qk2kDT-hQODQFqGghcr4lQ';
function getLocation() {
	var element = document.getElementById('map');
	map = new mapboxgl.Map({
  		container: 'map',
  		style: 'mapbox://styles/mapbox/satellite-v9',
		center: [-98.35, 39.5],
  		zoom: 4,
	});
  	if (navigator.geolocation) {
    		navigator.geolocation.getCurrentPosition(getUserPosition);
  	} else {
    		alert("Geolocation is not supported by this browser.");
  	}
}

function getUserPosition(position) {
	lat = position.coords.latitude;
	lng = position.coords.longitude;
	showPosition(lat,lng);
}

async function zipSearch() {
	let zipCd = document.getElementById("zipsearch").value;
	if (zipCd === "") {getLocation(); return;}
	url = 'https://api.openweathermap.org/data/2.5/weather?zip=' + zipCd + '&appid=e40d95c703aed46604f8e84a0b8291c6';
	var response = await fetch(url);
	var data = await response.json();
	lat = data.coord.lat; lng = data.coord.lon;
	markers.forEach((item) => {item.remove();});
	markers = [];
	showPosition(lat,lng);
}

async function showPosition(lat,lng) {
	url = 'https://api.openweathermap.org/data/2.5/onecall?lat=' + lat + '&lon=' + lng + '&units=imperial&appid=e40d95c703aed46604f8e84a0b8291c6';
	var response = await fetch(url);
	if (response.status === 404 || response.status ===400){alert("Please enter a valid zip code"); return;}
	var data = await response.json(); console.log(data);
	addData(data);
		var marker = new mapboxgl.Marker({
			color: "#18fc03"
		})

		marker.setLngLat([lng, lat]);
			if (data.alerts){alertsPresent(marker, data);}
		marker.addTo(map);
		markers.push(marker);
		map.flyTo({
			center: [lng, lat],
			zoom: 13,
			essential: true
		});
		let strForecast = getForecast(data);
		document.getElementById("svnDay").innerHTML = "<center>" + strForecast + "</center>";
}

function addData(data) {
		document.getElementById("currIcon").innerHTML = "<img src='https://openweathermap.org/img/wn/" + data.current.weather[0].icon + ".png' style='width: 20%;'>";
		document.getElementById("currDetail").innerHTML = data.current.weather[0].description ; 
		document.getElementById("currTemp").innerHTML = "" + Math.round(data.current.temp) + "&#8457";
		document.getElementById("realFeel").innerHTML = "" + Math.round(data.current.feels_like) + "&#8457";
		document.getElementById("currHumid").innerHTML = "" + data.current.humidity + "&#37";
		document.getElementById("currDew").innerHTML = "" + Math.round(data.current.dew_point)  + "&#8457";
		document.getElementById("currWind").innerHTML = "" + Math.round(data.current.wind_speed) + " mph";
		let num = (data.current.pressure * .0295301);
		let bp = num.toFixed(2);
		document.getElementById("currPressure").innerHTML = "" + bp + "in";
}

function getForecast(data) {
	let str = "";
	for (i = 0; i <= 7; i++) {
		let fday = forecastDay(i);
		if(str === '') {
			str = "<div class='row' style='margin-left: 10px;'><hr><center>" + fday + "</center></div><div class='row'><div class='col'><img src='https://openweathermap.org/img/wn/" + data.daily[i].weather[0].icon + ".png' style='width: 30%;'>" +
				"<br>" + data.daily[i].weather[0].description + "</div>" +
				"<div class='col' style='margin-top: 10px;'>High: " + Math.round(data.daily[i].temp.max) + "&#013" +
				"<br>Day Feel: " + Math.round(data.daily[i].feels_like.day) + "&#013" +
				"<br>Low: " + Math.round(data.daily[i].temp.min) + 
				"<br>Night Feel: " + Math.round(data.daily[i].feels_like.night) + "&#013" +
				"<br>humidity: " + data.daily[i].humidity + "&#37</div></div>";}
		else {
			str += "<div class='row' style='margin-left: 10px;'><hr><center>" + fday + "</center></div><div class='row'><div class='col'><img src='https://openweathermap.org/img/wn/" + data.daily[i].weather[0].icon + ".png' style='width: 30%;'>" +
				"<br>" + data.daily[i].weather[0].description + "</div>" +
				"<div class='col' style='margin-top: 10px;'>High: " + Math.round(data.daily[i].temp.max) + "&#013" +
				"<br>Day Feel: " + Math.round(data.daily[i].feels_like.day) + "&#013" +
				"<br>Low: " + Math.round(data.daily[i].temp.min) + 
				"<br>Night Feel: " + Math.round(data.daily[i].feels_like.night) + "&#013" +
				"<br>humidity: " + data.daily[i].humidity + "&#37</div></div>";}
	};
	return str; 
}

function forecastDay(i) {
	var d= new Date();
	d.setDate(d.getDate() + i);
	let text = d.toString();
	var dtArr = text.split(" ");
	document.getElementById("timeStamp").innerHTML = "at " + dtArr[4] + "";
	let fDay = dtArr[0] + " " + dtArr[1] + " " + dtArr[2] + " " + dtArr[3];
	return fDay;
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
setInterval(function(){showPosition(lat,lng);}, 300000);
