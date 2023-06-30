    // Load the FIFA dataset and world map data
    Promise.all([
    d3.csv("fifa.csv"),
    d3.json("countries.geojson")
]).then(function (data) {
    const fifaData = data[0];
    const worldMapData = data[1];

    console.log("FIFA dataset:", fifaData);
    console.log("World map data:", worldMapData);

    // Calculate player count and average rating by country
    const playerStats = d3.rollups(
        fifaData,
        v => ({
            count: v.length,
            avgRating: d3.mean(v, d => +d.Overall_Rating)
        }),
        d => d.Country
    );

    // Create a mapping object to handle country name discrepancies
    const countryMapping = {
        "England": "United Kingdom",
        "United States": "United States of America",
        "Northern Ireland" : "Ireland",
        "Republic of Ireland" : "Ireland"
    };

    // Map the country names to handle discrepancies
    const playerStatsData = Array.from(playerStats, ([country, stats]) => ({
        country: countryMapping[country] || country,
        count: stats.count,
        avgRating: stats.avgRating
    }));

    console.log("Player stats data:", playerStatsData);

    // Set up color scale based on player count
    const maxCount = d3.max(playerStatsData, d => d.count);
    const minCount = d3.min(playerStatsData, d => d.count);
    const colorScale = d3.scaleLinear()
        .domain([minCount, maxCount])
        .range(["lightblue", "blue"]);

    // Create a map projection
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath().projection(projection);

    // Append the map to the container
    const container = d3.select("#mapContainer");
    const svg = container.append("svg")
        .attr("viewBox", "0 0 800 500")
        .style("width", "100%")
        .style("height", "100%")
        .call(d3.zoom()
            .extent([[0, 0], [800, 500]])
            .scaleExtent([1, 8])
            .on("zoom", zoomed))
        .on("dblclick.zoom", null); // Disable double-click zoom

    // Create a group for the map
    const map = svg.append("g");

    // Draw the map
    map.selectAll("path")
        .data(worldMapData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "color-scale")
        .style("fill", d => {
            const countryData = playerStatsData.find(item => item.country === d.properties.ADMIN);
            return colorScale(countryData ? countryData.count : 0);
        })
        .append("title")
        .text(d => {
            const countryData = playerStatsData.find(item => item.country === d.properties.ADMIN);
            return `${d.properties.ADMIN}: ${countryData ? countryData.count : 0} players | Avg Rating: ${countryData ? countryData.avgRating.toFixed(2) : 0}`;
        });

    // Add country labels
    const countryLabels = map.selectAll(".country-label")
        .data(worldMapData.features)
        .enter()
        .append("text")
        .attr("class", "country-label")
        .attr("transform", d => {
            const centroid = path.centroid(d);
            const offsetX = 0;
            const offsetY = 0;
            return `translate(${centroid[0] + offsetX}, ${centroid[1] + offsetY})`;
        })
        .attr("dy", "0.35em")
        .text(d => d.properties.ADMIN)
        .style("font-size", "12px"); // Set initial font size

    // Create legend
    const legendContainer = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20, 20)");
        

    // Add legend title
    legendContainer.append("text")
        .attr("class", "legend-title")
        .text("Player Count");
        
        

    // Calculate legend scale positions
    const legendScalePositions = d3.range(0, 1.01, 0.25);

    // Add legend color scale
    const legendScale = legendContainer.append("g")
        .attr("class", "legend-scale")
        .selectAll("rect")
        .data(legendScalePositions)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 30)
        .attr("y", 10)
        .attr("width", 30)
        .attr("height", 7)
        .style("fill", d => colorScale(d * maxCount));

    // Add legend labels
    legendContainer.selectAll(".legend-label")
        .data(legendScalePositions)
        .enter()
        .append("text")
        .attr("class", "legend-label")
        .attr("x", (d, i) => i * 30)
        .attr("y", 30)
        .text(d => Math.round(d * maxCount));

    function zoomed(event) {
        map.attr("transform", event.transform);

        // Adjust font size based on zoom level
        const fontSize = 12 / event.transform.k; // Adjust the divisor to control the rate of font size change

        if (fontSize <= 4) {
            // Show labels when font size is above a threshold (e.g., 6)
            countryLabels.style("font-size", fontSize + "px");
        } else {
            // Hide labels when font size is below the threshold
            countryLabels.style("font-size", "0");
        }
    }
}).catch(function (error) {
    console.log(error);
});