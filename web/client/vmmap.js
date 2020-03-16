stream = io.connect(STREAM_URL);

DS("vmmap init");
Session.setDefault('vmmap', {})

function on_vmmap(msg) {
    DS("on vmmap");
    var vmmap = Session.get('vmmap');
    vmmap[msg['forknum']] = parse_vmmap_entries(msg['dat']);
    Session.set('vmmap', vmmap);
}
stream.on('vmmap', on_vmmap);

Deps.autorun(function redraw_vmmap() {
    DS("vmmap redraw")
    var forknum = Session.get("forknum");
    var repo    = Session.get("vmmap");
    if (!repo[forknum]) return;
    var vmmap = repo[forknum]['vmmap'];
    var vmmaphtml = '<div class="vmmap panelthing">';
    for (i in vmmap) {
        vmmaphtml += '<div class="vmmap_line" id="vmmap_' + i + '">'
            + '<span class="vmmap_addr">' + '0x' + vmmap[i].start.toString(16) + '</span>'
            + ' - <span class="vmmap_addr">' + '0x' + vmmap[i].end.toString(16) + '</span>'
            + ' <span class="vmmap_perm">' + vmmap[i].perm + '</span>'
            + ' <span class="vmmap_file">' + vmmap[i].file + '</span>'
            + '</div>'; // todo sanitize file name
    }
    vmmaphtml += '</div>'
    $('#vmmap').html(vmmaphtml);
});

Deps.autorun(function () {
    DS('vmmap highlight');
    var forknum = Session.get("forknum");
    var daddr   = Session.get('daddr');
    var maping = __vmmap_find_entry(forknum, daddr);
    if (!maping) return;
    let line = $('#vmmap_' + maping.idx);
    if (!line.hasClass('vmmap_highlight')) {
        $('.vmmap_line').removeClass('vmmap_highlight');
        line.addClass('vmmap_highlight');
        line.get()[0].scrollIntoView(true);
    }
})


function __vmmap_find_entry(forknum, addr) {
    if (!addr || addr.length <= 5 || addr.indexOf('_') !== -1) return undefined;
    var repo = Session.get('vmmap');
    if (repo[forknum] === undefined ) return undefined;
    var page = BigInt(addr) & 0xfffffffffffff000n;
    return repo[forknum].pageToEntry[page];
}

vmmap_find_entry = __vmmap_find_entry;


function parse_vmmap_entries(vmmap) {
    var parsed = [];
    var pageToEntry = {};
    var ls = vmmap.split("\n");
    for (i in ls) {
        var cs = ls[i].split(/ +/);
        var addrs = cs[0].split('-');
        var file = '';
        if (cs.length < 5) break;
        if (cs.length === 6) {
            file = cs[5];
            let path = file.split('/');//todo windows?
            let soname = path[path.length-1];
            if (soname !== undefined) {
                file = soname + '   ' + file;
            }
        }
        var perm = cs[1];
        var iperm = 0;
        if (perm.indexOf('x') !== -1) iperm |= 4;
        else if (perm.indexOf('w') !== -1) iperm |= 2;
        else if (perm.indexOf('r') !== -1) iperm |= 1;

        var start = BigInt('0x' + addrs[0]);
        var end = BigInt('0x' + addrs[1]);
        var it = start;
        var vmmap_entry = {
            idx: i,
            start: start,
            end:  end,
            perm: perm,
            iperm: iperm,
            file: file,
        };
        while (it < end) {
            // pageToPerm[it & pmask] = iperm;
            pageToEntry[it] = vmmap_entry;
            it += 0x1000n;
        }
        parsed.push(vmmap_entry)
    }
    return  {
        vmmap: parsed,
        pageToEntry: pageToEntry,
    };
}