let shelterData = [];

const map = L.map('map').setView([35.1796, 129.0756], 11);  // 부산 중심
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  shadowSize: [41, 41]
});


// ✅ 클러스터 그룹 생성
const markers = L.markerClusterGroup();

// ✅ 쉼터 마커 표시
fetch("http://127.0.0.1:8000/shelters")
  .then(res => res.json())
  .then(data => {
    console.log("✅ 쉼터 마커 로딩 완료:", data.length);
    shelterData = data;

    // ✅ 기본 위치 (부산 중심) 기준 추천 리스트 표시
    const defaultLat = 35.1796;
    const defaultLon = 129.0756;

    const nearby = shelterData.map(s => {
      const slat = parseFloat(s.latitude);
      const slon = parseFloat(s.longitude);
      const distance = getDistance(defaultLat, defaultLon, slat, slon);
      return { ...s, distance };
    }).filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));

    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 13);
     
    });
    

    nearby.sort((a, b) => a.distance - b.distance);
    renderShelterList(nearby.slice(0, 15)); 

    data.forEach(s => {
      const lat = parseFloat(s.latitude);
      const lon = parseFloat(s.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const marker = L.marker([lat, lon], { icon: blueIcon }).bindPopup(`
          <strong>${s.name}</strong><br/>
          주소: ${s.address}<br/>
        `);
        markers.addLayer(marker);
      }
    });

    map.addLayer(markers);
  })
  .catch(err => {
    console.error("❌ 쉼터 데이터 불러오기 실패:", err);
  });

// ✅ 폭염 알림 체크
fetch("http://127.0.0.1:8000/alert")
  .then(res => res.json())
  .then(data => {
    const alertBox = document.createElement("div");
    alertBox.style.padding = "10px";
    alertBox.style.fontWeight = "bold";
    alertBox.style.marginBottom = "10px";
    alertBox.innerText = data.message;
    alertBox.style.color = data.alert ? "red" : "black";
    document.querySelector("main").prepend(alertBox);
  });

// ✅ 주소 → 위경도 변환 (Nominatim)
async function searchAddressNominatim(query) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (data.length > 0) {
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    console.log("📍 변환된 좌표:", lat, lon);
    return { lat, lon };
  } else {
    alert("❌ 주소 결과를 찾을 수 없습니다.");
    return null;
  }
}

// ✅ 검색 버튼 클릭 처리
async function handleUserLocation() {
  const address = document.getElementById("user-address").value;
  const location = await searchAddressNominatim(address);
  if (!location) return;

  const { lat, lon } = location;
  map.setView([lat, lon], 15);

  // ✅ 내 위치에 빨간 마커 추가
  const userMarker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
  .bindPopup("📍 현재 검색 위치").openPopup();


  const nearby = shelterData.map(s => {
    const slat = parseFloat(s.latitude);
    const slon = parseFloat(s.longitude);
    const distance = getDistance(lat, lon, slat, slon);
    return { ...s, distance };
  }).filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));

  nearby.sort((a, b) => a.distance - b.distance);
  renderShelterList(nearby.slice(0, 15));
}

// ✅ 추천 리스트 렌더링
function renderShelterList(shelters) {
  const container = document.getElementById("recommendation-list");
  container.innerHTML = "";

  shelters.forEach(s => {
    const el = document.createElement("div");
    el.className = "hospital-card";
    el.innerHTML = `
      <strong>${s.name}</strong><br/>
      ${s.address}<br/>
      거리: ${s.distance.toFixed(2)}km
    `;
    container.appendChild(el);
  });
}

// ✅ 거리 계산 함수
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
