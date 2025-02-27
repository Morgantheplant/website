// App.js - Defines a backbone model class for the whole app.
var AppModel = Backbone.Model.extend({

  initialize: function(params){
    this.set('currentSong', new SongModel());
    this.set('songQueue', new SongQueue());

    /* Note that 'this' is passed as the third argument. That third argument is
    the context. The 'play' handler will always be bound to that context we pass in.
    In this example, we're binding it to the App. This is helpful because otherwise
    the 'this' we use that's actually in the funciton (this.set('currentSong', song)) would
    end up refering to the window. That's just what happens with all JS events. The handlers end up
    getting called from the window (unless we override it, as we do here). */

    // NOTE: since the song model is present in both the library
    // and songQueue collections, you can attach a listener to either
    // and still receive the play event.
    // Some people might find it easier to conceptualize the songQueue
    // approach. HOWEVER: the tests won't pass!
    // DON'T attach listeners to both otherwise you will get 2 play events!

    // this.get('songQueue').on('play', function(song){
    params.library.on('play', function(song){
      this.set('currentSong', song);
    }, this);

    params.library.on('enqueue', function(song){
      this.get('songQueue').add(song);
    }, this);

    this.get('songQueue').on('stop', function(){
      this.set('currentSong', null);
    }, this);
  }

});
