import assert from 'assert';
import {symbolicSubstitution, graphCode} from '../src/js/code-analyzer';



describe('f1', () => {

    it('test1: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x,y){\n' +
                '    let a = 1;\n' +
                '    if (a < x) {\n' +
                '        return a;\n' +
                '    }\n' +
                'return x;\n' +
                '}', '2, 3'),
            'function foo(x, y) {\n' +
            '    let a = 1;\n' +
            '    if (a < x) {\n' +
            '        return a;\n' +
            '    }\n' +
            '    return x;\n' +
            '}');
    });
});


describe('f2', () => {
    it('test2: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y, z){\n' +                '    let a = x + 1;\n' +
                '    let b = a + y;\n' +                '    let c = 0;\n' +
                '    \n' +                '    if (b < z) {\n' +
                '        c = c + 5;\n' +                '    } else if (b < z * 2) {\n' +
                '        c = c + x + 5;\n' +                '    } else {\n' +
                '        c = c + z + 5;\n' +                '    }\n' +
                '    \n' +                '    return c;\n' +
                '}\n', '1, 2, 3'),'function foo(x, y, z) {\n' +            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +            '    let c = 0;\n' +
            '    if (b < z) {\n' +            '        c = c + 5;\n' +
            '    } else if (b < z * 2) {\n' +            '        c = c + x + 5;\n' +
            '    } else {\n' +            '        c = c + z + 5;\n' +
            '    }\n' +
            '    return c;\n' +
            '}');
    });
});


describe('f3', () => {
    it('test3: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y, z){\n' +                '   let a = x + 1;\n' +
                '   let b = a + y;\n' +                '   let c = 0;\n' +
                '   \n' +                '   while (a < z) {\n' +
                '       c = a + b;\n' +                '       z = c * 2;\n' +
                '       a++;\n' +                '   }\n' +
                '   \n' +                '   return z;\n' +
                '}\n','1, 2, 3')
            ,'function foo(x, y, z) {\n' +            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +            '    let c = 0;\n' +
            '    while (a < z) {\n' +            '        c = a + b;\n' +
            '        z = c * 2;\n' +            '        a++;\n' +
            '    }\n' +
            '    return z;\n' +
            '}'
        );});
});


describe('f4', () => {
    it('test4: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y, z){\n' +                '   let a = x + 1;\n' +
                '   let b = a + y;\n' +                '   let c = 0;\n' +
                '   \n' +                '   while (a < z) {\n' +
                '       c = a + b;\n' +                '       z = c * 2;\n' +
                '       a++;\n' +                '   }\n' +
                '   \n' +                '   return z;\n' +
                '}\n','1, 2, 0')
            ,'function foo(x, y, z) {\n' +            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +            '    let c = 0;\n' +
            '    while (a < z) {\n' +            '        c = a + b;\n' +
            '        z = c * 2;\n' +            '        a++;\n' +
            '    }\n' +            '    return z;\n' +
            '}'
        );});
});

describe('f5', () => {
    it('test5: ', () => {
        assert.equal(
            symbolicSubstitution('',''),
            '');
    });
});


describe('f6', () => {
    it('test6: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x,y){\n' +
                '    let a = 1;\n' +
                '    for(var i=0; i<3;i++) {\n' +
                '        a=a+1;\n' +
                '    }\n' +
                '    return a;\n' +
                '}','1, 2'),
            'function foo(x, y) {\n' +
            '    let a = 1;\n' +
            '    for (var i = 0; i < 3; i++) {\n' +
            '        a = a + 1;\n' +
            '    }\n' +
            '    return a;\n' +
            '}');
    });
});


describe('f7 updateExp', () => {
    it('test7: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y){\n' +                '    let b = y;   \n' +
                'y++;\n' +                'for (let i=0; i<5; i++) {\n' +
                'b = b+1;\n' +                '}\n' +
                'return b;\n' +
                '}','1, 2'),
            'function foo(x, y) {\n' +
            '    let b = y;\n' +
            '    y++;\n' +
            '    for (let i = 0; i < 5; i++) {\n' +
            '        b = b + 1;\n' +
            '    }\n' +
            '    return b;\n' +
            '}');
    });
});

describe('f8', () => {
    it('test8: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y){\n' +
                '    let a = [3];\n' +
                '    if (x>0){\n' +
                '        return 0;\n' +
                '    }\n' +
                '    return 1;\n' +
                '}','1, 2'),
            'function foo(x, y) {\n' +
            '    let a = [3];\n' +
            '    if (x > 0) {\n' +
            '        return 0;\n' +
            '    }\n' +
            '    return 1;\n' +
            '}');
    });
});



describe('f9', () => {
    it('test9: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x, y){\n' +                '    let a = [3];\n' +
                '    a[0]=x;\n' +
                '    if (y>0){\n' +
                '        return 0;\n' +
                '    }\n' +
                '    return -1;\n' +
                '}','1, 2'),
            'function foo(x, y) {\n' +
            '    let a = [3];\n' +
            '    a[0] = x;\n' +
            '    if (y > 0) {\n' +
            '        return 0;\n' +
            '    }\n' +
            '    return -1;\n' +
            '}');
    });
});

describe('f10', () => {

    it('test10: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x,y){\n' +
                '    let a = 1;\n' +
                '    if (a < x) {\n' +
                '        return a;\n' +
                '    }\n' +
                'else return x;\n' +
                '}', '1, 2'),
            'function foo(x, y) {\n' +
            '    let a = 1;\n' +
            '    if (a < x) {\n' +
            '        return a;\n' +
            '    } else\n' +
            '        return x;\n' +
            '}');
    });
});


describe('f11', () => {
    it('test11: ', () => {
        assert.equal(
            (graphCode('','')).length,
            0);
    });
});


describe('f12', () => {
    it('test12: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x,y){\n' +                '    let a = [1,2];\n' +
                '    if (a[0] < x) {\n' +                '        return a;\n' +
                '    }\n' +
                'else return x;\n' +
                '}', '1, 2'),
            'function foo(x, y) {\n' +
            '    let a = [\n' +
            '        1,\n' +
            '        2\n' +
            '    ];\n' +
            '    if (1 < x) {\n' +
            '        return a;\n' +
            '    } else\n' +
            '        return x;\n' +
            '}');
    });
});


describe('f13', () => {
    it('test13: ', () => {
        assert.equal(
            symbolicSubstitution('function foo(x,y){\n' +                '    let a = [1,2];\n' +
                '    if (a[x] < y) {\n' +                '        return a;\n' +
                '    }\n' +                'else return x;\n' +
                '}', '0, 2'),
            'function foo(x, y) {\n' +
            '    let a = [\n' +
            '        1,\n' +
            '        2\n' +
            '    ];\n' +
            '    if (1 < y) {\n' +
            '        return a;\n' +
            '    } else\n' +
            '        return x;\n' +
            '}');
    });
});

