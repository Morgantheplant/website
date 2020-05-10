'use strict';

FamousFramework.component('morgan:apple-tv', {
    behaviors: {
        '#rotator-node': {
            'size': function (contextSize) {
                //grab context size from state
                return [contextSize, contextSize];
            },
            'position-z': function (rootZ) {
                return rootZ;
            },
            'align': [0.5, 0.5],
            'mount-point': [0.5, 0.5],
            'origin': [0.5, 0.5], //center the origin so it rotates around its middle  
            'rotation': function (rotationValue) {
                // this will drive Z rotation animations
                //rotate backwards and listen for Z rotation changes
                return [-Math.PI / 2, 0, rotationValue];
            }
        },
        '.gallery-item': {
            'size': [100, 100],
            '$repeat': function (srcs) {
                return srcs; //repeat over srcs array
            },
            'position-x': function ($index, xPos) {
                return xPos[$index];
            },
            'position-y': function ($index, yPos) {
                return yPos[$index];
            },
            'position-z': function ($index, positionZ) {
                return positionZ[$index]; // this will drive the moving image animations
            },
            'rotation': [Math.PI / 2, 0, 0], //rotate images forward
            'content': function ($index, srcs) {
                return '<img src="' + srcs[$index] + '" style="height:100px;width:100px"/>';
            }

        }
    },
    events: {
        '$lifecycle': {
            'post-load': function ($state, $famousNode) {
                var firstUrl = $state.get('firstUrl');
                $.ajax({
                    type: "GET",
                    dataType: "jsonp",
                    cache: false,
                    url: firstUrl,
                    success: function (userdata) {
                        userdata.data.forEach(function (item, index) {
                            $state.set(['srcs', index], item.images.standard_resolution.url);
                        });

                        $state.set('nextUrl', userdata.pagination.next_url);

                        $.ajax({
                            type: "GET",
                            dataType: "jsonp",
                            cache: false,
                            url: userdata.pagination.next_url,
                            success: function (userdata) {
                                var urls = [];
                                userdata.data.forEach(function (item, index) {
                                    urls.push(item.images.standard_resolution.url);
                                });
                                $state.set('imageQueue', urls);
                                $state.set('nextUrl', userdata.pagination.next_url);
                            },
                            error: function () {
                                alert('request to instagram failed');
                                $state.set('imageQueue', imageData);
                                $state.set('nextUrl', $state.get('firstUrl'));
                            }

                        });
                    },
                    error: function () {
                        alert('request to instagram failed');
                        $state.set('imageQueue', imageData);
                        $state.set('nextUrl', $state.get('firstUrl'));
                    }
                });

                var id = $famousNode.addComponent({
                    onUpdate: function (time) {
                        var srcs = $state.get('srcs');
                        for (var i = 0; i < srcs.length; i++) {
                            var currentZ = $state.get(['positionZ', i]);
                            // if image is out of screen move it back to bottom
                            if (currentZ < -$state.get('contextSize')) {
                                currentZ = $state.get('contextSize') + 100;

                                $state.set(['srcs', i], $state.get(['imageQueue', i]));
                                var item = $state.get('counter');
                                //ajax call if first to top
                                if (item === srcs.length) {
                                    var nextUrl = $state.get('nextUrl');
                                    $.ajax({
                                        type: "GET",
                                        dataType: "jsonp",
                                        cache: false,
                                        url: nextUrl,
                                        success: function (userdata) {

                                            userdata.data.forEach(function (item, index) {
                                                $state.set(['imageQueue', index], item.images.standard_resolution.url);
                                            });

                                            var setNext = userdata.pagination.next_url || $state.get('firstUrl');

                                            $state.set('nextUrl', setNext);
                                        },
                                        error: function () {
                                            alert('request to instagram failed');
                                            $state.set('imageQueue', imageData);
                                            $state.set('nextUrl', $state.get('firstUrl'));
                                        }
                                    });

                                    $state.set('counter', item--);

                                    //$state.set('imageQueue', url)
                                }

                                if (item < 0) {
                                    $state.set('counter', srcs.length);
                                }
                            }
                            $state.set(['positionZ', i], currentZ - 1);
                        }
                        $famousNode.requestUpdateOnNextTick(id);
                    }
                });
                $famousNode.requestUpdateOnNextTick(id);
            }
        },
        '.gallery-item': {
            'click': function ($state) {

                $state.set('rotationValue', $state.get('rotationValue') - Math.PI / 2, {
                    duration: 1000,
                    curve: 'easeIn'
                }).thenSet('rotationValue', $state.get('rotationValue') - Math.PI * 2, {
                    duration: 2000,
                    curve: 'easeOut'
                });

                $state.set('rootZ', -250, {
                    duration: 1000,
                    curve: 'easeOut'
                }).thenSet('rootZ', 0, {
                    duration: 200,
                    curve: 'easeInOut'
                });
            }
        }
    },
    states: {
        rotationValue: 0, // value to rotate all of our images 
        srcs: imageData, // this will store the images srcs
        contextSize: contextSize, //update this value as well
        positionZ: randomCoordinates(imageData),
        rootZ: 0,
        imageQueue: [],
        xPos: randomCoordinates(imageData, true),
        yPos: randomCoordinates(imageData, true),
        nextUrl: '',
        firstUrl: 'https://api.instagram.com/v1/users/self/media/recent/?access_token=15669958.d2f01f7.415d395532404e03a78380db380c2710',
        counter: 20
    },
    tree: 'apple-tv.html'
}).config({
    includes: ['jquery-1.11.3.min.js', 'galleryData.js', 'apple-tv.css']
});