import React, { useEffect, useState } from "react";
import { Box, Button, Input, Text, useToast } from "@chakra-ui/react";
import { supabase } from "../supabaseClient";
import { getLastUploadDate } from "../utils/getLastUploadDate";
import { getLatestExcelUrl } from "../utils/getLatestExcelUrl";

const TarjetasQA = () => {
  const [file, setFile] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("Cargando...");
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  const fetchLastDate = async () => {
    const date = await getLastUploadDate();
    setLastUpdated(date || "No disponible");
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "⚠️ Archivo requerido",
        description: "Por favor selecciona un archivo Excel",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Subir archivo a Supabase
      const fileName = `reporte_tarjetas_${Date.now()}.xlsx`;
      
      const { data, error } = await supabase.storage
        .from("files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        throw new Error(`Error al subir archivo: ${error.message}`);
      }

      // 2. Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);
      
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      toast({
        title: "✅ Archivo subido",
        description: "Generando dashboard...",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // 3. Llamar al backend para generar dashboard
      console.log("🔄 Llamando al backend con URL:", publicUrl);
      
      const response = await fetch("https://xlsx-backend.onrender.com/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ url: publicUrl }),
      });

      console.log("📡 Respuesta del backend:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Resultado:", result);

      // 4. Actualizar UI
      await fetchLastDate();
      setIframeKey((prev) => prev + 1);
      setFile(null); // Limpiar archivo seleccionado

      toast({
        title: "🎉 Dashboard generado",
        description: "El dashboard se ha actualizado correctamente",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

    } catch (error) {
      console.error("❌ Error completo:", error);
      toast({
        title: "❌ Error",
        description: error.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Función para probar la conexión con el backend
  const testBackendConnection = async () => {
    try {
      console.log("🔍 Probando conexión con backend...");
      const response = await fetch("https://xlsx-backend.onrender.com/");
      const text = await response.text();
      console.log("🌐 Backend respuesta:", text);
      
      toast({
        title: response.ok ? "✅ Backend conectado" : "❌ Backend no responde",
        description: text,
        status: response.ok ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("❌ Error de conexión:", error);
      toast({
        title: "❌ Error de conexión",
        description: "No se puede conectar con el backend",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchLastDate();
    // Probar conexión al cargar
    testBackendConnection();
  }, []);

  return (
    <Box p={6}>
      <Box mb={4}>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={testBackendConnection}
          mb={3}
        >
          🔍 Probar Conexión Backend
        </Button>
        
        <Input 
          type="file" 
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
          mb={2}
        />
        
        <Button 
          onClick={handleUpload}
          isLoading={isGenerating}
          loadingText="Generando..."
          disabled={!file || isGenerating}
          colorScheme="blue"
          size="md"
        >
          {isGenerating ? "🔄 Generando Dashboard..." : "📊 Subir y Generar Dashboard"}
        </Button>
        
        <Text mt={2} fontSize="sm" color="gray.500">
          Última actualización: {lastUpdated}
        </Text>
        
        {file && (
          <Text mt={1} fontSize="sm" color="blue.600">
            📁 Archivo seleccionado: {file.name}
          </Text>
        )}
      </Box>

      <Box mt={4} w="100%" h="calc(100vh - 300px)" border="1px solid" borderColor="gray.200" borderRadius="md">
        <iframe
          key={iframeKey}
          src={`https://xlsx-backend.onrender.com/qa-dashboard.html?t=${Date.now()}`}
          title="QA Dashboard"
          width="100%"
          height="100%"
          style={{ border: "none" }}
          onLoad={() => console.log("📊 Dashboard cargado")}
          onError={() => console.error("❌ Error cargando dashboard")}
        />
      </Box>
    </Box>
  );
};

export default TarjetasQA;