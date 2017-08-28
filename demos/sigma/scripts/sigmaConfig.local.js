(function () { 
 return angular.module("sigma.config", [])
.constant("sigmaConfigLocal", {"urls":{"aggregate":"http://varnerbox.com:5000/aggregate","coverage":"http://varnerbox.com:5000/coverage","overlays":"http://varnerbox.com:5000/overlay","pointconverter":"http://varnerbox.com:5000/point-analysis","aoianalysis":"http://varnerbox.com:5000/aoianalysis","correlate":"http://varnerbox.com:5000/correlate"},"mapCenter":{"lat":44.366428,"lng":-81.453945,"zoom":8},"layers":{"baselayers":{"standard":{"id":"standard","name":"Standard Map","url":"http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png","type":"xyz"},"cycle":{"id":"cycle","name":"Cycle Map","url":"http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png","type":"xyz"}}},"defaultBaselayer":"standard","defaultProjection":"L.CRS.EPSG3857"});

})();

