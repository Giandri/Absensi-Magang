const OFFICE_CONFIG = {
    name: process.env.NEXT_PUBLIC_OFFICE_NAME || "Kantor BWS BABEL",
    latitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LAT || "-2.1360196129894264"),
    longitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LNG || "106.0848296111155"),
    radius: parseInt(process.env.NEXT_PUBLIC_MAX_RADIUS || "100", 10), // Meter
};


function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}


function isWithinOfficeRadius(latitude: number, longitude: number): boolean {
    const distance = calculateDistance(
        latitude,
        longitude,
        OFFICE_CONFIG.latitude,
        OFFICE_CONFIG.longitude
    );
    return distance <= OFFICE_CONFIG.radius;
}

interface GeocodingResult {
    display_name: string;
    address: {
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
    };
}

interface LocationResult {
    fullAddress: string;
    shortAddress: string;
    area: string;
    city: string;
}

async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<LocationResult | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "E-Absen-App/1.0",
                },
                next: { revalidate: 3600 },
            }
        );

        if (!response.ok) {
            console.error("Geocoding API error:", response.status);
            return null;
        }

        const data: GeocodingResult = await response.json();
        const address = data.address;
        const area = address.suburb || address.village || address.town || "";
        const city = address.city || address.town || address.state || "";
        const parts = [address.road, area, city].filter(Boolean);
        const shortAddress = parts.slice(0, 2).join(", ") || data.display_name.split(",").slice(0, 2).join(",");

        return {
            fullAddress: data.display_name,
            shortAddress: shortAddress,
            area: area,
            city: city,
        };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return null;
    }
}

export async function getLocationName(
    latitude: number | null,
    longitude: number | null
): Promise<string> {
    if (!latitude || !longitude) return "N/A";


    if (isWithinOfficeRadius(latitude, longitude)) {
        return OFFICE_CONFIG.name;
    }

    try {
        const location = await reverseGeocode(latitude, longitude);
        if (location) {
            return location.shortAddress;
        }
    } catch (error) {
        console.error("Error getting location name:", error);
    }

    return `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;
}

export { OFFICE_CONFIG };
