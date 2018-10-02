$(document).ready(function() {

    var map = L.map('map').setView([35.162, -80.489], 7);
    var outages = new L.markerClusterGroup();

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);




    d3.json("data/outages30Day.js", function(error, data) {


        function print_filter(filter) {
            var f = eval(filter);
            if (typeof(f.length) != "undefined") {} else {}
            if (typeof(f.top) != "undefined") {
                f = f.top(Infinity);
            } else {}
            if (typeof(f.dimension) != "undefined") {
                f = f.dimension(function(d) {
                    return "";
                }).top(Infinity);
            } else {}
            console.log(filter + "(" + f.length + ") = " + JSON.stringify(f).replace("[", "[\n\t").replace(/}\,/g, "},\n\t").replace("]", "\n]"));
        }


        data.features.forEach(function(d) {
            // console.log(d.properties.StartTime);
            var tempDate = new Date(d.properties.StartTime);
            d.date = tempDate;
            //console.log(typeof d.properties.StartTime);
            //console.log(tempDate);
            //console.log(d.date);

        });


        var facts = crossfilter(data.features);
        var all = facts.groupAll(); //reduces all rows into one.

        var allDim = facts.dimension(function(d) {
            return d;
        });

        // dates
        var dateDimension = facts.dimension(function(d) {
            return d.date
        });
        var dateGroup = dateDimension.group().reduceSum(function(d) {
            return d.properties.CustomersAffected
        });


        // Counts per weekday
        var dayOfWeek = facts.dimension(function(d) {
            var day = d.date.getDay();
            var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return day + '.' + name[day];
        });
        var dayOfWeekGroup = dayOfWeek.group();


        //counts per hour
        var hourOfDay = facts.dimension(function(d) {
            var hour = d.date.getHours();
            return hour;
        });
        var hourOfDayGroup = hourOfDay.group();

        var minDate = dateDimension.bottom(1)[0].date;
        var maxDate = dateDimension.top(1)[0].date;


        var options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        };

        //outage causes
        var causeDimension = facts.dimension(function(d) {
            return d.properties.Cause
        });
        var causeGroup = causeDimension.group();



        var dataCount = dc.dataCount(".dc-data-count")
            .dimension(facts)
            .group(all)
            .html({
                some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records | <a href="javascript:dc.filterAll(); dc.renderAll();"> Reset All</a>',
                all: 'All records selected.Please click on a graph to apply filters.'
            });


        var geomDimension = facts.dimension(function(d) {
            //console.log(d.geometry.coordinates[0]);
            return d.geometry

        });


        //table
        var dataTable = dc.dataTable("#table")
            .width(900)
            .height(300)
            .dimension(allDim)
            .showGroups(false)
            //.size(10)
            .group(function(d) {})
            .columns([{
                    label: 'StartTime',
                    format: function(d) {
                        return d.date.toLocaleDateString('en-US', options)
                    }
                },
                {
                    label: 'Substation',
                    format: function(d) {
                        return d.properties.Substation
                    }
                },
                {
                    label: 'Feeder',
                    format: function(d) {
                        return d.properties.Feeder
                    }
                },
                {
                    label: 'Cause',
                    format: function(d) {
                        return d.properties.Cause
                    }
                },
                {
                    label: '# Out',
                    format: function(d) {
                        return d.properties.CustomersAffected
                    }
                }
            ])
            .sortBy(function(d) {
                return d.date
            })
            .order(d3.ascending)
            .on('renderlet', function(table) {
                //table.selectAll('.dc-table-group').classed('info',true);
                outages.clearLayers();
                allDim.top(Infinity).forEach(function(d) {
                    var marker = L.marker([+d.geometry.coordinates[1], +d.geometry.coordinates[0]]);
                    var popupContent = "<p>" + name + " " + d.date + "</p>";
                    popupContent += "<p>" + d.properties.CustomersAffected + "</p>";
                    popupContent += "<p>" + d.properties.Feeder + d.properties.Cause + "</p>";

                    marker.bindPopup(popupContent);
                    outages.addLayer(marker);
                });
                map.addLayer(outages);
                map.fitBounds(outages.getBounds());
            });



        //bar chart************************************
        var barchart = dc.barChart("#rangechart")
            .width(700)
            .height(75)
            .margins({
                top: 10,
                bottom: 30,
                right: 10,
                left: 70
            })
            .dimension(dateDimension)
            .group(dateGroup)

            .x(d3.time.scale().domain([minDate, maxDate]));

        barchart.yAxis().ticks(0).outerTickSize(0);
        barchart.xAxis().ticks(7);


        //line chart**********************************
        var lineChart = dc.lineChart("#chart1")
            .width(700)
            .height(200)
            .margins({
                top: 10,
                bottom: 30,
                right: 10,
                left: 70
            })
            .dimension(dateDimension)
            .group(dateGroup, "Customers Out")
            // .stack(dateGroupCust,"Customers Out")
            .yAxisLabel("Customers Out")
            .elasticY(true)
            .renderHorizontalGridLines(true)
            .renderArea(true)
            .legend(dc.legend().x(800).y(5).itemHeight(12).gap(5))
            .x(d3.time.scale().domain([minDate, maxDate]))
            // .xyTipsOn(true)
            .brushOn(false)

            .rangeChart(barchart); //ties it to the chart above.
        // .centerBar(true)
        // .xUnits(dc.units.fp.precision(100));
        // .barPadding(0.2)
        // .outerPadding(0)


        lineChart.yAxis().ticks(5);
        lineChart.xAxis().ticks(7);

        //day of week chart******************************
        var dayOfWeekChart = dc.rowChart("#chart")
            .width(250)
            .height(180)
            .margins({
                top: 20,
                left: 20,
                right: 10,
                bottom: 30
            })
            .dimension(dayOfWeek)
            .group(dayOfWeekGroup)
            //.colors(d3.scale.category20())
            .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
            .renderLabel(true)
            .label(function(d) {
                return d.key.split('.')[1];
            })
            .renderTitle(true)
            .title(function(d) {
                return d.value;
            })
            .elasticX(true);

        // handle axis functions separately
        dayOfWeekChart.xAxis().ticks(4);



        //pie chart-outage causes****************************
        var quarterChart = dc.pieChart("#quarter")
            .width(180)
            .height(180)
            .radius(80)
            .innerRadius(30)
            .drawPaths(true)
            .renderLabel(false)
            .colors(d3.scale.category20c())
            .transitionDuration(800)
            .dimension(causeDimension)
            .group(causeGroup);

        //hour chart********************************
        var hourOfDayChart = dc.barChart("#hour-chart")
            .width(550)
            .height(200)
            .margins({
                top: 0,
                left: 30,
                right: 10,
                bottom: 50
            })
            .dimension(hourOfDay)
            .group(hourOfDayGroup)
            .renderLabel(true)
            .elasticY(true)
            .yAxisLabel("Outages")
            .xAxisLabel("24-Hour Time")
            .controlsUseVisibility(true)
            .label(function(d) {
                return d.value;
            })
            .x(d3.scale.linear()
                .domain([0, 24])
                .rangeRound([0, 10 * 24]))
            .renderTitle(true)
            .title(function(d) {
                return d.value;
            })
            .brushOn(true);




        // handle axis functions separately
        hourOfDayChart.xAxis().ticks(24);
        hourOfDayChart.yAxis().ticks(6);



        // register handlers
        d3.selectAll('a#all').on('click', function() {
            dc.filterAll();
            dc.renderAll();
        });

        d3.selectAll('a#year').on('click', function() {
            dayOfWeekChart.filterAll();
            dc.redrawAll();
        });

        d3.selectAll('a#month').on('click', function() {
            quarterChart.filterAll();
            dc.redrawAll();
        });

        d3.selectAll('a#day').on('click', function() {
            dayChart.filterAll();
            dc.redrawAll();
        });



        dc.renderAll();


        //console.log(data);
        //console.log(facts);
        //console.log(dateDimension.top(10));
        //print_filter('hourOfDayGroup');


    });
});
