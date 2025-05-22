import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box } from "@chakra-ui/react";
import Papa from "papaparse";

const cities = [
  { name: "Laguna", lat: 25.54443, lng: -103.406786 },
  { name: "Chihuahua", lat: 28.632996, lng: -106.0691 },
  { name: "Ciudad Juárez", lat: 31.690363, lng: -106.424547 },
  { name: "Morelos", lat: 18.681304, lng: -99.101349 },
  { name: "Jalisco", lat: 20.659698, lng: -103.349609 },
  { name: "Bajío", lat: 21.019, lng: -101.257358 },
  { name: "Quintana Roo", lat: 18.5036, lng: -88.3055 },
  { name: "Guerrero", lat: 17.55219, lng: -99.514492 },
  { name: "Veracruz", lat: 19.173773, lng: -96.134224 },
  { name: "Puebla", lat: 19.041297, lng: -98.2062 },
  { name: "Chiapas", lat: 16.750384, lng: -93.116667 },
  { name: "Aguascalientes", lat: 21.8818, lng: -102.291656 },
  { name: "Sinaloa", lat: 24.809065, lng: -107.394383 },
  { name: "Yúcatan", lat: 20.96737, lng: -89.592586 },
  { name: "Baja California", lat: 30.8406, lng: -115.2838 },
  { name: "Queretaro", lat: 20.5888, lng: -100.3899 },
];

const AZTECA_COMPANIES = ["Azteca 7", "Azteca UNO", "ADN40", "Deportes", "A+", "Noticias"];
const BLOCK_SIZE = 9;

const PerformanceMap = ({ date }) => {
  const [data, setData] = useState([]);
  const [aztecaAvgScore, setAztecaAvgScore] = useState(null);

  useEffect(() => {
    Papa.parse(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv",
      {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          setData(data);
        },
      }
    );
  }, []);

  useEffect(() => {
    if (!data.length || !date) return;

    const keys = Object.keys(data[0]);
    const dateStr = new Date(date).toISOString().split("T")[0];

    let total = 0;
    let count = 0;

    AZTECA_COMPANIES.forEach((_, i) => {
      const base = (i + (keys.length / BLOCK_SIZE - AZTECA_COMPANIES.length)) * BLOCK_SIZE;
      const dateKey = keys[base];
      const typeKey = keys[base + 1];
      const scoreKey = keys[base + 3];

      data.forEach((row) => {
        if (row[dateKey] === dateStr && row[typeKey] === "nota") {
          const sc = parseFloat(row[scoreKey]);
          if (!isNaN(sc)) {
            total += sc;
            count++;
          }
        }
      });
    });

    const avg = count ? parseFloat((total / count).toFixed(1)) : null;
    setAztecaAvgScore(avg);
  }, [data, date]);

  const getColor = (score) => {
    if (aztecaAvgScore === null || isNaN(aztecaAvgScore)) return "#999";
    if (score < aztecaAvgScore * 0.85) return "#FF2965"; // red
    if (score < aztecaAvgScore) return "#FFA73D"; // orange
    return "#2BFFB9"; // green
  };

  const cityScores = cities.map((city) => {
    const cityCompany = data.find((row) => row.name === city.name);
    let score = null;

    if (cityCompany) {
      const keys = Object.keys(cityCompany);
      const dateStr = new Date(date).toISOString().split("T")[0];

      for (let i = 0; i < keys.length; i += BLOCK_SIZE) {
        const dateKey = keys[i];
        const typeKey = keys[i + 1];
        const scoreKey = keys[i + 3];

        if (cityCompany[dateKey] === dateStr && cityCompany[typeKey] === "nota") {
          const sc = parseFloat(cityCompany[scoreKey]);
          if (!isNaN(sc)) {
            score = sc;
            break;
          }
        }
      }
    }

    return { ...city, score };
  });

  return (
    <Box height="100%" borderRadius="lg" position="relative">
      <MapContainer
        center={[23.6345, -102.5528]}
        zoom={4.3}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {cityScores.map((city, idx) => (
          <CircleMarker
            key={idx}
            center={[city.lat, city.lng]}
            radius={10}
            color="black"
            fillColor={getColor(city.score)}
            fillOpacity={0.9}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <span>
                <strong>{city.name}</strong>
                <br />
                Score: {city.score !== null ? city.score.toFixed(1) : "No data"}
                <br />
                <span style={{ fontSize: "11px", color: "#ccc" }}>
                  Azteca Avg: {aztecaAvgScore !== null ? aztecaAvgScore.toFixed(1) : "N/A"}
                </span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default PerformanceMap;
