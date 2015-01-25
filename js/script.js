/* ParkingFacility(SPARQL) javascript file */

var dataObj;
var contactObj;
var map;
	
/* 初期化関数 */
$(document).ready(function() {
	/* 地図の初期位置・縮尺など */
	var mapOptions = {
	  center: new google.maps.LatLng(35.9604115,136.1911316),
	  zoom: 13,
	  mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	
	/* 地図の作成 */
	map = new google.maps.Map(document.getElementById("map_canvas"),mapOptions); 
	
	/* ボタンのイベント割当(色変更なので見た目的な) */
	var menuElement = document.getElementById('warp_br');
	menuElement.addEventListener('touchstart',function(event){
		$('#menuButton').css("background","#000000");
	},false);

	menuElement.addEventListener('touchend',function(event){
		$('#menuButton').css("background","#d12525");
	},false);
	loadMap(map);
});

	/* 駐車場のリストを取得するクエリ */
	var parkingQuery =  "PREFIX jrrk: <http://purl.org/jrrk#>\n"
	+"PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>\n"
	+"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"
	+"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n"
	+"PREFIX schema: <http://schema.org/>\n"
	+"select distinct ?contact ?lat ?long ?category ?capacity ?price ?address ?label ?image ?monthlyCharge where {\n"
	+"    graph <http://odp.jig.jp/rdf/jp/fukui/sabae/201> { \n"
	+"        OPTIONAL{ ?s jrrk:contact ?contact }.\n"
	+"        OPTIONAL{ ?s <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat }.\n"
	+"        OPTIONAL{ ?s <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long }.\n"
	+"        OPTIONAL{ ?s jrrk:category ?category }.\n"
	+"        OPTIONAL{ ?s jrrk:capacity ?capacity }.\n"
	+"        OPTIONAL{ ?s schema:price ?price }.\n"
	+"        OPTIONAL{ ?s rdfs:label ?label }.\n"
	+"        OPTIONAL{ ?s jrrk:address ?address }.\n"
	+"        OPTIONAL{ ?s schema:image ?image }.\n"
	+"        OPTIONAL{ ?s jrrk:monthlyCharge ?monthlyCharge }.\n"
	+"    }\n"
	+"}\n";
	
	/* 連絡先のリストを取得するクエリ */
	var contactQuery =  "PREFIX jrrk: <http://purl.org/jrrk#>\n"
	+"PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>\n"
	+"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"
	+"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n"
	+"PREFIX schema: <http://schema.org/>\n"
	+"select distinct ?node ?tel ?label where {\n"
	+"    graph <http://odp.jig.jp/rdf/jp/fukui/sabae/201> { \n"
	+"       ?node <http://schema.org/telephone> ?o;\n"
	+"       rdfs:label ?label;\n"
	+"       schema:telephone ?tel;\n"
	+"    }\n"
	+"}";
  
function loadMap (map){
	
  /* API問い合わせ用のURL生成 */
  var contactsUrl = "http://sparql.odp.jig.jp/api/v1/sparql?query=" + encodeURIComponent(contactQuery) + "&output=json";
  var url = "http://sparql.odp.jig.jp/api/v1/sparql?query=" + encodeURIComponent(parkingQuery) + "&output=json";
  
  //連絡先情報を先に取得
  $.ajax({
	  type: 'GET',
	  url: contactsUrl,
	  dataType: 'json',
	  success: function(json){
	    /* データが取得できた場合の処理を開始 */
	  	contactObj = json;  
	  }
  });
  
  //駐車場情報を取得
  $.ajax({
	  type: 'GET',
	  url: url,
	  dataType: 'json',
	  success: function(json){
	    /* データが取得できた場合の処理を開始 */
	    dataObj = json.results;
	    for(var j=0; j<dataObj.bindings.length; j++){	
	    	var marker = makeMarker(map,dataObj.bindings[j].lat.value,dataObj.bindings[j].long.value,null);
	    	marker.setTitle = (j.toString()+"番目");
	    	attachAction(marker, j,dataObj.bindings[j]);
	    }
	    
	     getNearestPoint()
	  }
  });
  
  /* イベントの割当 */
  google.maps.event.addListener(map, 'click', function(){
  	closeMenu();
  });
  
	  
}

/* マーカーの作成 */
var makeMarker = function(map, lat, long, data) {
	var pos = new google.maps.LatLng(lat, long);
	return new google.maps.Marker({
		position: pos,
		map: map,
		draggable: false,
	});
};

/* マーカーへのタッチイベントの割当 */
function attachAction(marker, number,data) {
  google.maps.event.addListener(marker, 'click', function() {
    var pos = new google.maps.LatLng(data.lat.value, data.long.value);
    map.panTo(pos);
    openMenu();
    $('#parkingLabel').text(data.label.value);
    $('#modal-Parking-Label').text(data.label.value);
    $('#modal-Parking-Price').text(data.price.value);
    $('#modal-Parking-Capacity').text(data.capacity.value);
    $('#modal-Parking-Address').text(data.address.value);
    $('#modal-Parking-Image').attr('src', data.image.value);
    if(!data.monthlyCharge){
    	//データがない場合
    	$('#modal-Parking-MonthlyCharge').text("--------");
    }else{
    	$('#modal-Parking-MonthlyCharge').text(data.monthlyCharge.value);
    }
    console.log(data.contact.value);
    $('#modal-Parking-Contact').text(getContact(data.contact.value));
  });
}

/* ノードの番号から連絡先情報を取得 */
function getContact(node){
	var results = contactObj.results.bindings;
	console.log(results);
	for(var i=0; i<results.length;i++){
		console.log(results[i].node.value);
		if(results[i].node.value === node){
			
			return (results[i].label.value)+" "+(results[i].tel.value);
		}
	}	
	return "--------";
}

/* メニューボタン用 */
function button(){
	if($('#menuButton').text()==="MENU"){
		openMenu();
	}else{
		closeMenu();
	}
}

/* メニューを開く */
function openMenu(){
	$('#app-panel').css("height","20%");
	$('#app-panel').css("visibility","visible");
	
  	$("#map_canvas").animate({ 
    	height: "80%"
  	}, 400 );
  	
  	$('#menuButton').css("visibility","visible");
  	$('#menuButton').text("CLOSE");
}

/* メニューを閉じる */
function closeMenu(){
	$('#app-panel').css("height","0%");
	$('#app-panel').css("visibility","hidden");

  	$("#map_canvas").animate({ 
    	height: "100%"
  	}, 400 );
  	$('#menuButton').css("visibility","hidden"); 
  	
  	$('#menuButton').text("MENU");
}

function getNearestPoint(){
	if (navigator.geolocation) {
	  //Geolocation APIを利用できる環境向けの処理
	  //ユーザーの現在の位置情報を取得
	  navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
	} else {
	  //Geolocation APIを利用できない環境向けの処理
		var pos = new google.maps.LatLng(35.9604115,136.1911316);
	    map.panTo(pos);
	}
}


/** 二点間の座標の距離を求めます(距離の単位はなし)
* 	現在位置と地点配列を比較して、どれが一番近いかを算出します。
*/
function calculateDistance (lat1,long1,lat2,long2) {
　　var a, b, d;
　　a = lat1 - lat2;
　　b = long1 - long2;
　　d = Math.sqrt(Math.pow(a,2) + Math.pow(b,2));
　　return d;
};


/***** ユーザーの現在の位置情報を取得 *****/
function successCallback(position) {
  var currentLat = position.coords.latitude;
  var currentLong = position.coords.longitude;
  var nearestPoint;
  var tempDistance = 999.99999;
  
  for(var j=0; j<dataObj.bindings.length; j++){	
  	var distance = calculateDistance(currentLat,currentLong,dataObj.bindings[j].lat.value,dataObj.bindings[j].long.value);
  	console.log(j+"番目の距離:"+distance+"　　　名称:"+dataObj.bindings[j].label.value);
  	if(distance<tempDistance){
  		tempDistance = distance;
  		nearestPoint = j;
  	}
  }
  
  showInfo(dataObj.bindings[nearestPoint]);
}

/***** 位置情報が取得できない場合 *****/
function errorCallback(error) {
  var err_msg = "";
  switch(error.code)
  {
    case 1:
      err_msg = "位置情報の利用が許可されていません";
      break;
    case 2:
      err_msg = "デバイスの位置が判定できません";
      break;
    case 3:
      err_msg = "タイムアウトしました";
      break;
  }
  alert(err_msg);
}

function showInfo(data){
  var pos = new google.maps.LatLng(data.lat.value, data.long.value);
  map.panTo(pos);
  openMenu();
  $('#parkingLabel').text(data.label.value);
  $('#modal-Parking-Label').text(data.label.value);
  $('#modal-Parking-Price').text(data.price.value);
  $('#modal-Parking-Capacity').text(data.capacity.value);
  $('#modal-Parking-Address').text(data.address.value);
  $('#modal-Parking-Image').attr('src', data.image.value);
  if(!data.monthlyCharge){
  	//データがない場合
  	$('#modal-Parking-MonthlyCharge').text("--------");
  }else{
  	$('#modal-Parking-MonthlyCharge').text(data.monthlyCharge.value);
  }
  console.log(data.contact.value);
  $('#modal-Parking-Contact').text(getContact(data.contact.value));
}