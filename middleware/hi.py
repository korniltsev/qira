from heapinspect import *
from heapinspect.core import *
from heapinspect import proc

LIBC_REGEX = '^[^\0]*libc(?:-[\d\.]+)?\.so(?:\.6)?$'
LD_REGEX = '^[^\0]*ld(?:-[\d\.]+)?\.so(?:\.2)?$'


class QiraProcForHI:
    def __init__(self, program, forknum, clnum):
        self.forknum = forknum
        self.clnum = clnum
        self.pid = 0xdead
        self.arch = '64'
        self.program = program
        self.trace = self.program.traces[self.forknum]

    @property
    def path(self):
        # print('proc.path ', self.program.program)
        return self.program.program

    @property
    def vmmap(self):
        # mapp = (files[fil], sz, off, return_code)
        res = []
        for i in self.trace.mapped:
            libpath, sz, off, addr = i
            # print(libpath, hex(addr), hex(off), hex(sz))
            res.append(proc.Map(addr, addr + sz, 7, libpath))
        return res

    @property
    def libc(self):

        for m in self.vmmap:
            if re.match(LIBC_REGEX, m.mapname):
                prefix = ''
                try:
                    f = open(os.environ['QEMU_LD_PREFIX'] + "/" + m.mapname, 'rb')
                    prefix = os.environ['QEMU_LD_PREFIX'] + "/"
                except:
                    f = open(m.mapname, 'rb')
                f.close()
                return prefix + m.mapname
        raise Exception('cannot find libc path')

    @property
    def ld(self):
        for i in self.trace.mapped_base:

            fp = i[-1]
            ss = i[0]
            masked = 0x7f0200000000 & ss
            # print(i)
            # print(hex(masked), hex(ss))
            if masked != 0x7f0200000000:  # todo
                continue

            if re.match(LD_REGEX, fp):
                # print('ld = ', fp)
                return fp
            if 'ld-linux-x86-64.so.2' in fp:
                # print('ld = ', fp)
                return fp
        assert False

    @property
    def bases(self):
        '''
        dict: Start addresses of the maps.

        Examples:
            >>> p = Proc(123)
            >>> print(p.bases)
            {
                'prog': 94107400671232,
                'stack': 140725576220672,
                'libc': 140274092433408,
                'ld-2.27.so': 140274098434048,
                'heap': 94107411861504,
                'mapped': 94107401531392,
            }
        '''
        bases = {
            'mapped': 0,
            'libc': 0,
            'prog': 0,
            'heap': 0,
            'stack': 0,
        }
        maps = self.vmmap
        for m in maps[::-1]:  # search backward to ensure getting the base
            # print('bases', m)
            if m.mapname == 'mapped':
                bases['mapped'] = m.start
            elif re.match(LIBC_REGEX, m.mapname):
                bases['libc'] = m.start
            elif m.mapname == self.path:
                bases['prog'] = m.start
            elif m.mapname == '[stack]':
                bases['stack'] = m.start
            # elif m.mapname == '[heap]':
            #     bases['heap'] = m.start
            else:
                name = os.path.basename(m.mapname)
                bases[name] = m.start
        bases['heap'] = self.trace.heap_min
        return bases

    def _range_merge(self, lst, range_vec):
        merged = 0
        for i, r in enumerate(lst):
            start, end = r
            if start == range_vec[1]:
                lst[i][0] = range_vec[0]
                merged = 1
                break
            elif end == range_vec[0]:
                lst[i][1] = range_vec[1]
                merged = 1
                break
        if not merged:
            lst.append(range_vec)

        return lst

    @property
    def ranges(self):
        '''dict: A dict of the range of maps.

        Examples:
            >>> p = Proc(123)
            >>> print(p.ranges)
            {'mapped': [
                [94107401531392, 94107401613312],
                [140274090311680, 140274090315776]
                ],
             'libc': [[140274092433408, 140274094239744]],
             'prog': [[94107400671232, 94107401531392]],
             'stack': [[140725576220672, 140725576503296]],
             'heap': [[94107411861504, 94107414138880]],
             'libpthread-2.27.so': [[140274092290048, 140274092408832]]}
        '''
        ranges = {
            'mapped': [],
            'libc': [],
            'prog': [],
            'heap': [],
            'stack': [],
        }
        maps = self.vmmap
        for m in maps:
            if m.mapname == 'mapped':
                name = 'mapped'
                ranges[name] = self._range_merge(
                    ranges[name],
                    [m.start, m.end])
            elif re.match(LIBC_REGEX, m.mapname):
                name = 'libc'
                ranges[name] = self._range_merge(
                    ranges[name],
                    [m.start, m.end])
            elif m.mapname == self.path:
                name = 'prog'
                ranges[name] = self._range_merge(
                    ranges[name],
                    [m.start, m.end])
            elif m.mapname == '[stack]':
                name = 'stack'
                ranges[name] = self._range_merge(
                    ranges[name],
                    [m.start, m.end])
            # elif m.mapname == '[heap]':
            #     name = 'heap'
            #     ranges[name] = self._range_merge(
            #         ranges[name],
            #         [m.start, m.end])
            else:  # non default ones
                name = os.path.basename(m.mapname)
                if name not in ranges:
                    ranges[name] = [[m.start, m.end], ]
                else:
                    ranges[name] = self._range_merge(
                        ranges[name],
                        [m.start, m.end])

        ranges['heap'] = [[self.trace.heap_min, self.trace.heap_max]]
        # print(ranges)
        return ranges

    def read(self, addr, size):
        # raw = self.trace.fetch_raw_memory(self.clnum, addr, size)
        # print('proc.read ', hex(addr))
        if addr < 0x1000:
            return b''
        found = False
        ranges = self.ranges
        # print(ranges)
        for k in ranges:
            # print(k)
            range_list = ranges[k]
            for one_range in range_list:
                if addr >= one_range[0] and addr <= one_range[1]:
                    found = True
                    break
        if not found:
            return b''
        mem = self.trace.fetch_memory(self.clnum, addr, size)
        res = []
        for i in range(size):
            if i in mem:
                res.append(mem[i])
            else:
                res.append(0)
        # print(mem)
        # mem = mem.values()
        # print(raw)
        bs = bytes(bytearray(res))
        # print(hex(addr) + ' => ', bytes.hex(bs))
        # print(bs)
        return bs
