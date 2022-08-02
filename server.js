const express = require('express');
const app = express();
var db; // 저장할 DB 변수
// MongoDB 연결
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
require('dotenv').config();
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// 미들웨어
app.use('/public', express.static('public'));

MongoClient.connect(process.env.DB_URL,function(err, client){
    // mongoDB 접속(connect)이 되면 내부코드 실행
    if(err) return console.log(err)
    db = client.db('TodoApp'); // TodoApp 이라는 database 폴더에 db 변수를 연결
    app.listen(process.env.PORT, function(){
        console.log('listening on 8080')
    });
})

// req 정보를 해석할 수 있도록 도와주는 라이브러리
app.use(express.urlencoded({extended: true})) 

// 함수 안에 함수가 있는 것 : 콜백 함수(ex. function(req,res)) ; 순차적으로 실행하고 싶을 때 사용 (조건에 따라 함수를 쓸 때)
app.get('/', (req,res) => {
    res.render('index.ejs');
});

app.get('/writing', function(req, res){
    res.render('write.ejs');
});

// form에서 Post 요청한 정보 (할일, 마감 날짜)는 req에 저장되어 있음
// 데이터마다 고유한 id를 부여하기 위해 총 게시물 갯수 + 1을 함!(총 게시물 갯수는 새로운 Collection으로 관리)
app.post('/newpost', function(req, res){
    // res.send('전송완료');
    db.collection('counter').findOne({name : '게시물 갯수'}, function(에러, 결과){
        var 총게시물갯수 = 결과.totalPost;

        db.collection('post').insertOne({ _id : 총게시물갯수 + 1, 제목 : req.body.title, 날짜 : req.body.date} ,function(){
            console.log('저장완료');
            db.collection('counter').updateOne({name : '게시물 갯수'},{ $inc : {totalPost:1} },function(에러, 결과){
                if(에러) return console.log(에러);
            })  // $inc : DB Update Operater
        });
    });
});

app.get('/list', function(요청,응답){
    db.collection('post').find().toArray(function(에러, 결과){
        console.log(결과);
        응답.render('list.ejs', { posts : 결과});
    }); // post 컬렉션에 저장된 모든 데이터를 가져옴
});

app.get('/search', (요청, 응답)=>{
    console.log(요청.query);
    var 검색조건 = [
        {
          $search: {
            index: 'titleSearch',
            text: {
              query: 요청.query.value,
              path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
            }
          }
        },
        { $sort : { _id : 1 }}
    ] 
    db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
    console.log(결과)
    응답.render('search.ejs', {data : 결과})
    })
})

app.delete('/delete/:id', function(요청,응답){
    db.collection('post').deleteOne(요청.body, function(에러, 결과){
        if (결과 == null) 응답.send('응 없어.');
        // 터미널 창에 출력
        console.log('삭제완료');
        // 서버가 동작했을 때 반드시 무언가 응답을 해줘야 한다.
        응답.status(200).send({ message : '성공했습니다'});
    })
})

app.get('/detail/:id', function(요청, 응답){
    // 요청.params.id : 요청 URL의 파라미터 중 id인 부분
    db.collection('post').findOne({_id : parseInt(요청.params.id)},function(에러, 결과){
        if (결과 == null) 응답.send('응 없어.'); 
        응답.render('detail.ejs', { data : 결과 });
    })
})

app.get('/edit/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)},function(에러, 결과){
        if (결과 == null) 응답.send('응 없어.'); 
        // 출처 : https://codingapple.com/forums/topic/%ec%9a%94%ec%b2%ad%ed%95%9c-%ed%8e%98%ec%9d%b4%ec%a7%80-%ec%97%86%ec%9d%84-%ec%8b%9c-%ec%b2%98%eb%a6%ac%eb%b0%a9%eb%b2%95%ec%97%90-%eb%8c%80%ed%95%b4-%ec%a7%88%eb%ac%b8%ec%9e%88%ec%8a%b5%eb%8b%88/
        응답.render('edit.ejs', { post : 결과 });
    })
})

app.put('/edit', function(요청, 응답){
    db.collection('post').updateOne({ _id : parseInt(요청.body.id) },{ $set : { 제목 : 요청.body.title, 날짜 : 요청.body.date}}, function(에러, 결과){
        console.log('수정완료');
        응답.redirect('/list');
    })
})



const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

// 미들웨어 : 요청과 응답 사이에 실행되는 코드
app.use(session({secret : '비밀코드', reesave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (요청, 응답){
    응답.render('login.ejs');
})

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), function(요청, 응답){
    응답.redirect('/');
});

app.get('/mypage', 로그인했니, function(요청, 응답){
    응답.render('mypage.ejs', {사용자 : 요청.user})
});

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    } else {
        응답.send('로그인 안하셨음 님아')
    }
}

// login시 실행
// // Strategy : 인증하는 방법
passport.use(new LocalStrategy({
    usernameField : 'id', // login.ejs의 id 입력폼의 name 속성
    passwordField : 'pw',
    session : true,  // 로그인 세션 저장 여부
    passReqToCallback: false
},function(입력한아이디, 입력한비번, done){
    // console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({id : 입력한아이디}, function(에러, 결과){
        if (에러) return done(에러) // 에러 처리 코드
        if (!결과) return done(null, false, {message : '존재하지 않는 아이디입니다.'})
        if (입력한비번 == 결과.pw){
            return done(null, 결과)
        } else {
            return done(null, false, {message : '비밀번호가 틀렸습니다.'})
        }
    })
}));

passport.serializeUser(function(user, done){
    done(null, user.id)
});

// 세션의 정보와 db의 데이터를 비교하고 그 정보를 가져와서 출력하는 식으로 사용할 수 있음
passport.deserializeUser(function(아이디, done){
    db.collection('login').findOne({id : 아이디}, function(에러, 결과){
        done(null, 결과) // 결과 - {id : test, pw : test} 이것을 다른 곳에서 요청.user를 통해 데이터를 접근할 수 있음
    })
});

