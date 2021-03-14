stream = io.connect(STREAM_URL);


function on_hi_res(msg) { 
  // alert(msg);
  msg = JSON.parse(msg)
  let forknum = msg[0];
  let clnum = msg[1];
  // console.log(forknum)
  // console.log(clnum)
  $('#hi_res').text(msg[2])
  Session.set('hi_forknum', forknum)
  Session.set('hi_clnum', clnum)

  // var hi_forknum = Session.get("hi_forknum");
  // var hi_clnum = Session.get("hi_clnum");

  // console.log('hi_forknum', hi_forknum)
  // console.log('hi_clnum', hi_clnum)

} stream.on('hi_result', on_hi_res);



Deps.autorun(function() { ;
  var forknum = Session.get("forknum");
  var clnum = Session.get("clnum");

  var hi_forknum = Session.get("hi_forknum");
  var hi_clnum = Session.get("hi_clnum");
  console.log(forknum, clnum, hi_forknum, hi_clnum)
  if (hi_forknum != forknum) {
  	$('#hi_res').text('')	
  } else {

  	if (hi_clnum == clnum) {
  		$('#hi_warning').text('')
  	} else {  		
  		$('#hi_warning').text('hi is for ' + hi_clnum + ' current is ' + clnum)
  	}
  }

  
  // stream.emit('getclnum', forknum, Session.get('clnum'), ['L', 'S'], 2)  // justification for more than 2?
});

$('#hi').on('click', (it) => {
    var forknum = Session.get("forknum");
    var clnum = Session.get("clnum");
    stream.emit('hi', forknum, clnum);
})