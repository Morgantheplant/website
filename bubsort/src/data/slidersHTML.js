define(function(require, exports, module){
    
    var htmlContent = "<div class=\"sliders\"><p>speed:</p><input id=\"speed\" class=\"rangesliders\" type=\"range\" min=\"10\" max=\"1000\" step=\"5\" value=\"300\"><p>height:</p><input id=\"heightslider\" class=\"rangesliders\" type=\"range\" min=\"10\" max=\"1000\" step=\"10\" value=\"600\"><p>width:</p><input id=\"widthslider\" type=\"range\" min=\"100\" max=\"800\" step=\"100\" value=\"600\"><p>perspective:</p><input id=\"translateZ\" class=\"rangesliders\" type=\"range\" min=\"\-500\" max=\"300\" step=\"10\" value=\"0\"><p>rotate:</p><input id=\"rotate\" class=\"rangesliders\" type=\"range\" min=\"-1.5\" max=\"1.5\" step=\".01\" value=\"0\"></div>"

    module.exports = htmlContent;

});
