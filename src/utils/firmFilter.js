/**
 * Firm-based filtering utilities
 * Used to filter data based on user's firm from Login table
 */

/**
 * Check if user can view data for a specific firm
 * @param {string} userFirmName - User's firm from Login table (stored in user.firmName)
 * @param {string} dataFirmName - Firm name in the data record
 * @returns {boolean} - True if user can view this data
 */
export function canViewFirm(userFirmName, dataFirmName) {
    // If user has "all" access, show everything
    if (!userFirmName || userFirmName.toLowerCase().trim() === "all") {
        return true;
    }

    // If data has no firm name, hide it (or show to all - can be configured)
    if (!dataFirmName) {
        return true; // Change to false to hide data without firm name
    }

    // Otherwise, only show matching firm (case-insensitive)
    return userFirmName.toLowerCase().trim() === dataFirmName.toLowerCase().trim();
}

/**
 * Apply firm filter to Supabase query
 * @param {object} query - Supabase query builder
 * @param {string} firmName - User's firm name
 * @param {string} columnName - Column name in table (default: "Firm Name")
 * @returns {object} - Updated query with firm filter applied
 */
export function applyFirmFilter(query, firmName, columnName = "Firm Name") {
    // If user has "all" access, no filtering needed
    if (!firmName || firmName.toLowerCase().trim() === "all") {
        return query;
    }

    // Apply firm filter
    return query.eq(columnName, firmName);
}

/**
 * Filter array data client-side based on firm
 * @param {Array} data - Array of data objects
 * @param {string} userFirmName - User's firm name
 * @param {string} firmFieldName - Field name containing firm (default: "Firm Name")
 * @returns {Array} - Filtered data
 */
export function filterByFirm(data, userFirmName, firmFieldName = "Firm Name") {
    if (!data || !Array.isArray(data)) return [];

    // If user has "all" access, return all data
    if (!userFirmName || userFirmName.toLowerCase().trim() === "all") {
        return data;
    }

    // Filter data by firm
    return data.filter(item => canViewFirm(userFirmName, item[firmFieldName]));
}
