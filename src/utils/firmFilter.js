/**
 * Firm-based filtering utilities
 * Used to filter data based on user's firm from Login table
 */

/**
 * Check if user can view data for a specific firm
 * @param {string|string[]} userFirmName - User's firm(s) from Login table (stored in user.firmName)
 * @param {string} dataFirmName - Firm name in the data record
 * @returns {boolean} - True if user can view this data
 */
export function canViewFirm(userFirmName, dataFirmName) {
    if (!userFirmName) return true;

    const normalizedUserFirm = Array.isArray(userFirmName) 
        ? userFirmName.map(f => String(f || "").toLowerCase().trim())
        : String(userFirmName || "").toLowerCase().trim();

    // If user has "all" access, show everything
    if (normalizedUserFirm === "all" || (Array.isArray(normalizedUserFirm) && normalizedUserFirm.includes("all"))) {
        return true;
    }

    // If data has no firm name, show it (as it's not restricted)
    if (!dataFirmName) {
        return true;
    }

    const normalizedDataFirm = String(dataFirmName || "").toLowerCase().trim();

    // Support both single string and array of firms for user
    if (Array.isArray(normalizedUserFirm)) {
        return normalizedUserFirm.includes(normalizedDataFirm);
    }

    return normalizedUserFirm === normalizedDataFirm;
}

/**
 * Apply firm filter to Supabase query
 * @param {object} query - Supabase query builder
 * @param {string|string[]} firmName - User's firm name(s)
 * @param {string} columnName - Column name in table (default: "Firm Name")
 * @returns {object} - Updated query with firm filter applied
 */
export function applyFirmFilter(query, firmName, columnName = "Firm Name") {
    if (!firmName) return query;

    // If user has "all" access, no filtering needed
    if (firmName === "all" || (Array.isArray(firmName) && firmName.map(f => f.toLowerCase().trim()).includes("all"))) {
        return query;
    }

    // Handle multiple firms via .in() operator
    if (Array.isArray(firmName)) {
        return query.in(columnName, firmName);
    }

    // Apply single firm filter
    return query.eq(columnName, firmName);
}

/**
 * Filter array data client-side based on firm
 * @param {Array} data - Array of data objects
 * @param {string|string[]} userFirmName - User's firm name(s)
 * @param {string} firmFieldName - Field name containing firm (default: "Firm Name")
 * @returns {Array} - Filtered data
 */
export function filterByFirm(data, userFirmName, firmFieldName = "Firm Name") {
    if (!data || !Array.isArray(data)) return [];
    if (!userFirmName) return data;

    // Filter data by firm using the canViewFirm utility
    return data.filter(item => canViewFirm(userFirmName, item[firmFieldName]));
}
