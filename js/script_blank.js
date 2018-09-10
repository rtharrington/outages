//JS and Leaflet

var map =L.map('map').setView([35.162, -80.489], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

//add some GeoJSON

var teardrop= new
L.Icon({iconUrl: "images/marker-icon.png"});

function feederlabel(feature,
layer) {
	layer.bindPopup("<h1 class='infoHeader'>Meter: </h1>" + feature.properties.SERIALNUMB +
                   "<h1 class='infoHeader'> Sub:</h1>" + feature.properties.SUBNAME);
	layer.setIcon(teardrop);
	
};

L.geoJSON(feedermismatch,{
	onEachFeature: feederlabel
}).addTo(map);




