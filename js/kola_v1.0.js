let imgOriginal;
var percentCanopyCover;

var resultsTable;

var realtimeLatitude;
var latitude;
var latArray;
var latRef;

var realtimeLongitude;
var longitude;

var realtimeAltitude;
var altitude;
var altitudeRef;

var country;
var state;
var region;

var vegetationType;
var dateTime;


var imgOriginalsRef;
var imgClassifiedRef;
var storageRef;
var user;

var weatherObj; 
var instances ="";
var elems = "";
var apiInformationDiv = "";

let mesonentStations;
var stationDataCSV;
var loadingWeatherDataLabel;
var btnUploadLabel;
var userLocationLat;
var userLocationLon;
var boolWeatherUpdate = 0;

var errorDiv;
var errorContent;
var id; // This id will be used in success and error in geolocation 

function preload() {

     // check whether mesonent station loaded to the system
     if (typeof(localStorage.getItem("mesonentStations"))== "object") {
        stationDataCSV = loadTable("data/stationData.csv","csv", "header");
     }

     // internet sourse check 
    let online = navigator.onLine;
    if(online == false){
         alert("You are not connect to internet");
     }
    
    // Get the user location
    getLocation(ShowLocationRelatedInformation);
}

function setup() {

    console.log("Welcome to kola 1.0.");

  

    // Converting the data in to JSON
    if (typeof(localStorage.getItem("mesonentStations"))== "object") { // already read the file and stored in system
        convertStationsTOJSON();
    }

    // gloabla varaiables
    resultsGrid                 = document.getElementById('resultGrid');
    apiInformationDiv           = document.getElementById('api-information-div');
    logoContainer               = document.getElementById("leafcontainer");
    loadingWeatherDataLabel     = document.getElementById('weatherDataStatusLabel');
    errorDiv                    = document.getElementById('errorDiv');
    errorContent                = document.getElementById('errorContent');
    btnUploadLabel              = document.getElementById('btn-upload-label');
   
    //preload assignment
    resultsGrid.style.display   = "none";

    // Upload button
    btnUpload                   = createFileInput(gotFile,'multiple'); //p5
    btnUpload.style('display','none');
    btnUpload.parent("btn-upload-label");

    

}  // End setup()



function weatherDataRetrieveCheck(){

     // Mesonent Weather data check
    let storageWatherData = localStorage.getItem("mesonetWeatherData"); 

    if (typeof(storageWatherData)== "object") {  // The object doesnt exist in the storage
        boolWeatherUpdate = 1;
    }


    if(typeof(storageWatherData) == "string"){ // stringyfied data object in the localstorage
       

        if(storageWatherData.length == 0 ){ // empty
            boolWeatherUpdate = 1;
        }  


       if(storageWatherData.length > 0){

            // Mesonent weather data  ->  {string} 
            // Mesonet weather data already stored in the local storage.
            // Checking for the upload data is no more than one day old.

            weatherObj      =   getMesonentDataFromLocalStorage(); // Retrieve 
            dateCheck       =   getDate();              // todays date .
            loggedDate      =   weatherObj.storedDate;  // weather data last updated.

            if(dateCheck == loggedDate){ // check the weather updated time stamo
               cameraControl('enable');
            }else{
                boolWeatherUpdate = 1;
            }
       }

    }

    // weather data needs to be updated
    if(boolWeatherUpdate == 1 ){
        // Mesonet weather data havent loaded never been loaded to local storage
        getWeatherData(); 
        return;
    }

}

function cameraControl(status){
    if(status = "enable"){
        btnUpload.attribute('disabled', '' );  // disable camera btn
        btnUploadLabel.onclick = null;  
    }

    if(status = "disable"){
        btnUpload.removeAttribute('disabled');    
        btnUploadLabel.onclick = null;
      
    }
}
/**
 * got File function will trigger when the data is updated.
 */
function gotFile(file) {
        if (file.type === 'image'){
            loadImage(file.data,function(imgOriginal){
                console.log("before the picture is taken to see if the coordinates changed after words");
                console.log(JSON.parse(localStorage.getItem('coordinates')));
                // getLocation
                getLocation(); //update recent location to the local storage. 
                
                
                let coordinateObj = JSON.parse(localStorage.getItem('coordinates'));
                var [matchedStation,minimumDistance] = findClosestStation(coordinateObj.latitude,coordinateObj.longitude); // User geolocation need to be set

                // Check for a change of nearest station. I
                // if changed , gather the weather data from the nearest station. 
                if(matchedStation != localStorage.getItem('nearestStation')){
                    localStorage.setItem('nearestStation',matchedStation); // setting the new found nearest station. 
                    alert("Station Changed. Gathering data");
                    getWeatherData(); 
                }

                // Clean the result grid value
                document.getElementById("canopeoCover_val").innerHTML ="";
                document.getElementById("cropCoefficient_val").innerHTML = "";
                document.getElementById("evapotranspiration_val").innerHTML = "";
                document.getElementById("cropEvapotranspiration_val").innerHTML ="";

                // empty picture div
                var anlysedImgTag = document.getElementsByClassName('analysed-images-tag');
                    if (anlysedImgTag !== null){
                        document.getElementById("orignal-image").innerHTML ="";
                        document.getElementById("classified-image").innerHTML ="";
                    }
                logoContainer.style.display    = "none";
  
                // Displaying the result grid 
                resultsGrid.style.visibility   = 'visible';
                resultsGrid.style.display      = "block";
                // Hide the api status from the screen
                apiInformationDiv.style.display= "none";
    
                // Create image tags
                let imgOriginalId   = 'img-original'; 
                let imgClassifiedId = 'img-classified';
               
                // Resize image so that the largest side has 1440 pixels
                if(imgOriginal.width>=imgOriginal.height){
                    imgOriginal.resize(1440,0); 
                } else {
                    imgOriginal.resize(0,1440);
                }
                imgOriginal.loadPixels();
               
                
                // Initiatve classified image
                imgClassified = createImage(imgOriginal.width,imgOriginal.height);
                imgClassified.loadPixels();

                // Classify image following manuscript settings
                let RGratio = 0.95;
                let RBratio = 0.95;
                let canopyCover = 0;

                for(let y=0; y<imgClassified.height; y++){
                    for(let x=0; x<imgClassified.width; x++){
                        let index = (x + y * imgClassified.width)*4;
                    
                        let R = float(imgOriginal.pixels[index+0]);
                        let G = float(imgOriginal.pixels[index+1]);
                        let B = float(imgOriginal.pixels[index+2]);
                    
                        if (R/G < RGratio && B/G < RBratio && 2*G-R-B>20){
                            imgClassified.pixels[index+0] = 255;
                            imgClassified.pixels[index+1] = 255;
                            imgClassified.pixels[index+2] = 255;
                            imgClassified.pixels[index+3] = 255;
                            canopyCover += 1;
                        } else {
                            imgClassified.pixels[index+0] = 0;
                            imgClassified.pixels[index+1] = 0;
                            imgClassified.pixels[index+2] = 0;
                            imgClassified.pixels[index+3] = 255;
                        }
                    }
                }

                imgClassified.updatePixels();
                percentCanopyCover  =  round(canopyCover/(imgClassified.width * imgClassified.height)*1000)/10;

                // Calculate aspect ratio for thumbnails and resize images
                var aspectRatio     =  imgClassified.width/imgClassified.height;

                // Thumbnail original image
                thumbnailOriginal  = createImg(imgOriginal.canvas.toDataURL(),'original image');
                thumbnailOriginal.size(imgOriginal.width*aspectRatio,imgOriginal.height*aspectRatio);
                thumbnailOriginal.size(imgOriginal.width,imgOriginal.height);
                thumbnailOriginal.id(imgOriginalId);
                thumbnailOriginal.parent('orignal-image');
                thumbnailOriginal.addClass('analysed-images-tag');
                
                // Thumbnail classified image
                thumbnailClassified = createImg(imgClassified.canvas.toDataURL(),'classified image');
                thumbnailClassified.size(imgClassified.width*aspectRatio,imgClassified.height*aspectRatio);
                thumbnailClassified.size(imgClassified.width,imgClassified.height);
                thumbnailClassified.id(imgClassifiedId);
                thumbnailClassified.parent('classified-image');
                thumbnailClassified.addClass('analysed-images-tag');
                //thumbnailClassified.style.border = "5px solid black;"
                
                // Get weather data
                 weatherObj    = getMesonentDataFromLocalStorage();

                // Calculate values
                etoVal         = getETOValue(coordinateObj,weatherObj);
                etCrop         = getETCrop(percentCanopyCover,etoVal);
                cropCoffection = float(getCropCoeffcient(percentCanopyCover));

                // calculation error checker
                 if(isNaN(etoVal)){
                    alert("Weather data could not be retrieved");
                    location.reload(); 
                 }

                // Assiging the data to cards
                document.getElementById("canopeoCover_val").innerHTML =percentCanopyCover;
                document.getElementById("cropCoefficient_val").innerHTML = cropCoffection.toFixed(2);
                document.getElementById("evapotranspiration_val").innerHTML = etoVal;
                document.getElementById("cropEvapotranspiration_val").innerHTML =etCrop;

          });
        }else{
            alert("The file entered is not valid. Please enter a image"); // wrong format
        }
}


function degreeToDecimal(D,M,S,ref) {
    let decimal = Math.round( (D + M/60 + S/3600) * 1000000 )/ 1000000;
    if (ref === 'W' || ref === 'S'){
        decimal = decimal * -1;
    }
    return decimal;
}

function altitudeToMeters(value, ref) {
    let meters;
    if(ref === 1){
        value = value * -1;
    }
    meters = Math.round(value);
    return meters;
}
/* 
    Get users location
    The location will be updated to the local storage
*/
function getLocation(ShowLocationRelatedInformation) {
    
    if (navigator.geolocation) {
        id = navigator.geolocation.watchPosition(showPosition,showError);
        console.log(id);
    } else {
        realtimeLatitude    = null;
        realtimeLongitude   = null;
        realtimeAltitude    = null;
        country             = null;
        state               = null;
        region              = null;
        console.log('Navigator not available')
    }
}

function showPosition(position) {

    // Reduce the sensitivit of the cordinates  
    realtimeLatitude    =   Math.round(position.coords.latitude*10**6)/10**6;
    realtimeLongitude   =   Math.round(position.coords.longitude*10**6)/10**6;
    realtimeAltitude    =   position.coords.accuracy; // A;titude

    // Altitude retrived check
    if(realtimeAltitude == null ){
        realtimeAltitude = 0;
    }

    let coordinatesObject  = {
        latitude    : realtimeLatitude,
        longitude   : realtimeLongitude,
        altitude    : realtimeAltitude
    }

    // store the coordinates data to local storage to future use
    localStorage.setItem('coordinates',JSON.stringify(coordinatesObject));

    userLattitudeText           = document.getElementById('userLattitudeText');
    userLattitudeText.innerHTML = realtimeLatitude;
    userLongitudeText           = document.getElementById('userLongitudeText');
    userLongitudeText.innerHTML = realtimeLongitude;

    return ShowLocationRelatedInformation();
  }

  function showError(error) {

    errorDiv.style.display      =   "flex";
    logoContainer.style.display =   "none";
    resultsGrid.style.display   =   "none";

    navigator.geolocation.clearWatch(id);
    switch(error.code) {

      case error.PERMISSION_DENIED:
        errorContent.innerHTML = "<b>Location Service Required.</b><br><text>Sorry, the app requires the location of the user. You must allow the location to be active during the usage of this app .<text></br></br>";
        //alert("You need to allow geo-location for the app to wor  k. Please click on retry");
        break;
      case error.POSITION_UNAVAILABLE:
        errorContent.innerHTML = "Location information is unavailable."
        break;
      case error.TIMEOUT:
        errorContent.innerHTML = "The request to get user location timed out."
        break;
      case error.UNKNOWN_ERROR:
        errorContent.innerHTML = "An unknown error occurred."
        break;
    }
  }

  /**
   * Call back function for the geolocation 
   * Accepted - Display data
   * No - Error
   */
  function ShowLocationRelatedInformation(){
      // All the mesonent station need to be loadeed and set
    let coordinateObj                    = JSON.parse(localStorage.getItem('coordinates'));
    let [matchedStation,minimumDistance] = findClosestStation(coordinateObj.latitude,coordinateObj.longitude); // User geolocation need to be set
    let distanceLabelText                = document.getElementById("distanceLabelText");
    let nearestStationLabelText          = document.getElementById("nearestStationLabelText");
    
    localStorage.setItem('nearestStation',matchedStation); 
    
    distanceLabelText.innerHTML         = minimumDistance.toFixed(2) + " miles ";
    nearestStationLabelText.innerHTML   = matchedStation;

    // Recieved geolocation from the user and found the nearest station
    // Gather weather data from the nearest station   
    weatherDataRetrieveCheck();

}


/**
 *  Retrive data from the Mesonet Api and store the information from in the local storage of the browser
 */
function getWeatherData(){

    console.log("get weather function initiated.");
    // Getting the latest data
    nearestStation  =  localStorage.getItem("nearestStation"); 
    dateStr         =  getDate(); // today date customized to api requirements

    // fetch data url
    mesonetRestApi   = "https://mesonet.k-state.edu/rest/stationdata/?stn="+nearestStation+"&int=day&t_start="+dateStr+"&t_end="+dateStr+"&vars=PRECIP,WSPD2MVEC,TEMP2MAVG,TEMP2MMIN,TEMP2MMAX,RELHUM2MMAX,RELHUM10MMIN,SR,WSPD2MAVG";
    
    // Loading data notification
    loadingWeatherDataLabel.innerHTML = 'Loading Weather Data <i class="fas fa-sync fa-spin">';

    const FETCH_TIMEOUT = 50000;
    let didTimeOut      = false;

    new Promise(function(resolve, reject) {
        const timeout  = setTimeout(function() {
            didTimeOut = true;
            reject(new Error('Request timed out'));
        }, FETCH_TIMEOUT);
        
        fetch(mesonetRestApi)
            .then(response =>  {
                // Clear the timeout as cleanup
                clearTimeout(timeout);
                if(!didTimeOut) {
                    console.log('fetch good! ', response);
                    resolve(response);
                }
                loadingWeatherDataLabel.innerHTML = 'Weather data retrieved <i class="fas fa-check"></i>';
                return response.text();
            })
            .then(data => {
                    // prepare data
                    let lineSeperation = data.split(/\r?\n/);

                    // Setting the value in the local storage
                    localStorage.setItem('mesonetWeatherData', JSON.stringify(lineSeperation[1]));
                    // clear the timeout and resolve promise
                    console.log("here we got data",timeout);
                    clearTimeout(timeout); 

                    // data recieved ui modifications
                    cameraControl('enable');
            })
            .catch(function(err) { // catch for fetch
                console.log('Failed. Still trying ! ', err);
                // Rejection already happened with setTimeout
                if(didTimeOut) return;
                // Reject with error
                reject(err);
            });

    })
    .then(function() {
        // Request success and no timeout
        console.log('good promise, no timeout! ');
    });

}

/**
 * Storing the Api data in the local storage 
 */
function getMesonentDataFromLocalStorage(){
    
    // Retrieve the object from storage
    var apiData  = localStorage.getItem('mesonetWeatherData').split(",").map(function(item) {
        return parseInt(item, 10);
    });      
    
    let dateStr      = getDate();

    let weatherObject  = {
        timestamp     : apiData[0],
        station       : apiData[1],
        tempAvg       : apiData[2],
        tempMin       : apiData[3],
        tempMax       : apiData[4],
        humidityMax   : apiData[5],
        humidityMin   : apiData[6],
        precp         : apiData[7], 
        solarRad      : apiData[8],
        windSpeed     : apiData[9],
        doy           : dayOftheYear(),
        storedDate    : dateStr
    }

    return weatherObject;
}

/**
 * Return short(grass) evapotranspiration value
 * @param {object} location  An object carries langgitude and latitude
 * @param {object} weather  Kansas mesonent api data
 * @returns  evapotranspiration ETo
 */
function getETOValue(location,weather) {

    const missingData = -9999;
    const atmPressure = 101.3 * ((293 - 0.0065 * location.altitude) / 293)**5.26;
    const Cp    = 0.001013; // Approx. 0.001013 for average atmospheric conditions
    const epsilon =  0.622;
    const lamda = 2.45;
    const gamma = (Cp * atmPressure) / (epsilon * lamda); // Approx. 0.000665

    //// Wind speed
    const windHeight = 1.5; // Most common height in[meters]
    let windSpeed2m;
    if (weather.windSpeed === missingData || weather.windSpeed === null) {
      windSpeed2m = 2;
    } else {
      windSpeed2m = weather.windSpeed * (4.87 / Math.log((67.8 * windHeight) - 5.42));  // Eq. 47, FAO-56 windHeight in [m]
    }
    
    //// Air humidity
    const eTmax = 0.6108 * Math.exp(17.27 * weather.tempMax / (weather.tempMax + 237.3)); // Eq. 11, //FAO-56
    const eTmin = 0.6108 * Math.exp(17.27 * weather.tempMin / (weather.tempMin + 237.3));
    const es = (eTmax + eTmin) / 2;

    //// Vapor pressure
    const delta = 4098 * (0.6108 * Math.exp(17.27 * weather.tempAvg / (weather.tempAvg + 237.3))) / (weather.tempAvg + 237.3)**2;
    let ea;
    if (weather.humidityMin === missingData || weather.humidityMax === missingData || weather.windSpeed === null) {
      ea = 0.6108 * Math.exp(17.27 * weather.tempMin/(weather.tempMin + 237.3));
    } else {
      ea = (eTmin * (weather.humidityMax / 100) + eTmax * (weather.humidityMin / 100)) / 2;
    }

    //// Solar radiation
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * weather.doy/365);  // Eq. 23, FAO-56
    const phi = Math.PI / 180 * location.latitude; // Eq. 22, FAO-56
    const d = 0.409 * Math.sin((2 * Math.PI * weather.doy/365) - 1.39);
    const omega = Math.acos(-Math.tan(phi) * Math.tan(d));
    const Gsc = 0.0820; // Approx. 0.0820
    const Ra = 24 * 60 / Math.PI * Gsc * dr * (omega * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(omega));

    // Clear Sky Radiation: Rso (MJ/m2/day)
    const Rso =  (0.75 + (2 * 10**-5) * location.altitude) * Ra ; // Eq. 37, FAO-56

    // * Measured solar Radiation: Rs (MJ/m2/day)
    if (weather.solarRad === missingData || weather.windSpeed === null) {
      weather.solarRad = Math.min(0.16 * Ra * Math.sqrt(weather.tempMax - weather.tempMin), Rso);
    }

    // Rs/Rso = relative shortwave radiation (limited to <= 1.0)
    const alpha = 0.23; // 0.23 for hypothetical grass reference crop
    const Rns = (1 - alpha) * weather.solarRad; // Eq. 38, FAO-56
    const sigma  = 4.903 * 10**-9;
    const maxTempK = weather.tempMax + 273.16;
    const minTempK = weather.tempMin + 273.16;
    const Rnl =  sigma * (maxTempK**4 + minTempK**4) / 2 * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * (weather.solarRad / Rso) - 0.35); // Eq. 39, FAO-56
    const Rn = Rns - Rnl; // Eq. 40, FAO-56

    // Soil heat flux density
    const soilHeatFlux = 0; // Eq. 42, FAO-56 G = 0 for daily time steps  [MJ/m2/day]

    // ETo calculation*
    
    const ETo = (0.408 * delta * (weather.solarRad - soilHeatFlux) + gamma * (900 / (weather.tempAvg + 273)) * windSpeed2m * (es - ea)) / (delta + gamma * (1 + 0.34 * windSpeed2m));

    return Math.round(ETo*10)/10;
  }


  /**
   * Return the day of the year
   * January 1 is the first day of the year
   * @return  n th number of the year
   */
  function dayOftheYear(){
    var today   = new Date();
    var start   = new Date(today.getFullYear(), 0, 0); // Constructing the Jan 1 for the given year
    var diff    = today - start; // time differnece by second
    var oneDay  = 1000 * 60 * 60 * 24;
    var days    = Math.floor(diff / oneDay); // calculate days 
    return days;
  }

 /**
   * Return the day of the year
   * January 1 is the first day of the year
   * @param  cc the first {@cc float} canopy cover percentage
   * @param etc the second  {@eto float}  reference evapotranspiration (mm, mm d^-1)
   * @return  crop evapotranspiration ETc
   */
  function getETCrop(cc,eto){
    let etCrop;
    etCrop = eto * getCropCoeffcient(cc);
    return Math.round(etCrop * 100) / 100;
  }

   /**
   * Get crop coffeicient Kc
   * @param  cc the first {@cc float} canopy cover percentage
   * @return crop coffecient  Kc
   */
  function getCropCoeffcient(cc){
     return  (1.1 * (cc/100) + 0.17);
  }

  /**
   * Generate the string which contain the date string guidline for Kansas mesonet api 
   * January 1 is the first day of the year
   * @return  
   * ex : If we are planning to return Jan 1st 2020
   *      20200101000000 - > 2020 + 01 + 01 + 000000
   */
  function getDate(){
    
    date        = new Date();
    // getting the yesterday date
    date.setDate(date.getDate() - 1);
    var dd      = (date.getDate() < 10 ? '0' : '') + date.getDate();
    var MM      = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
    var yyyy    = date.getFullYear();
 
    // create the year
    return (yyyy + MM +dd +"000000" );
 }

/**
 * calculate great-circle distance between two points on a sphere using 
 * haversine function
 * @param {float} lat1  location 1 latitude
 * @param {float} lon1  location 1 longitude
 * @param {float} lat2  location 2 latitude
 * @param {float} lon2  location 2 longitude
 * @returns {float} distant in miles
 */
function distance(lat1, lon1, lat2, lon2) {

     // Prototype function to ease the calucation of the radians
   
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
        // converting to radians in to radians
        var dLat =((lat2 - lat1) * Math.PI ) / 180;  
        var dLon = ((lon2 - lon1)* Math.PI ) / 180;  

        // convert to radians 
        lat1 = (lat1 * Math.PI ) / 180; 
        lat2 = (lat2 * Math.PI ) / 180; 

        // apply formulae 
        var a   =   Math.pow(Math.sin(dLat / 2), 2) +  
                    Math.pow(Math.sin(dLon / 2), 2) *  
                    Math.cos(lat1) *  
                    Math.cos(lat2); 
        var rad = 3958.8;  // radias of the earth in miles
        var c   = 2 * Math.asin(Math.sqrt(a)); 
        return rad * c ; // distance in miles 
		
	}
}

/**
 *  Read the data/stationData.csv and save the file in the 
 */
function convertStationsTOJSON(){

  //cycle through the table
  var strMesonentStation ="{"

  for ( let r = 0; r < stationDataCSV.getRowCount(); r++){

    strMesonentStation += '"'+ stationDataCSV.getString(r, 0)+'":{';
    for (let c = 0; c < stationDataCSV.getColumnCount(); c++) {
        strMesonentStation += '"'+stationDataCSV.columns[c] + '":"'+stationDataCSV.getString(r, c) +'",';  
    }
    strMesonentStation = strMesonentStation.substring(0, strMesonentStation.length - 1);
    strMesonentStation += "}," ;  

  } 
  
  strMesonentStation = strMesonentStation.substring(0, strMesonentStation.length - 1);
  strMesonentStation += "}"

  // store mesonet station in the local storage
  localStorage.setItem('mesonentStations', strMesonentStation);   

}

// Generate array from an input of string from file
/**
 * 
 * @param {string} data input string with '/n' 
 */
function dataToArray (data) {
    rows = data.split("\n");
    return rows.map(function (row) {
    	return row.split(",");
    });
};


/**
 * Finds the nearest station to the user location
 * @param {float} userLocationLat : users current location latitude  
 * @param {float} userLocationLon : users current location longitute
 * @returns {list} [ nearest station , minimim distance]
 */

function findClosestStation(userLocationLat,userLocationLon){

    let d ; // distance
    let retrievedStations   = localStorage.getItem('mesonentStations');
    let stationData         = JSON.parse(retrievedStations); // Getting the data from the local storage
    let distanceArray       = new Array();

    // Calculate distance between two locations
    for ( stationName in stationData){  
        d = distance(userLocationLat,userLocationLon,stationData[stationName].LATITUDE,stationData[stationName].LONGITUDE);
        distanceArray[stationName] = d;
    }

    let keys            = Object.keys(distanceArray);
    let minimumDistance = Math.min.apply(null, keys.map(function(x) { return distanceArray[x]} ));
    let matchedStation  = keys.filter(function(y) { return distanceArray[y] === minimumDistance });

    return [matchedStation,minimumDistance];
}