const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cookieParser = require("cookie-parser");
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors')
require('dotenv').config()
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173","https://b9a11-9673c.web.app","https://b9a11-9673c.firebaseapp.com"],
    credentials: true
}))
app.use(express.json())
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.guoefzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);
async function run() {
  try {
    const assignmentCollection = client.db("learnx").collection("assignments");
    const takeassignments = client.db("learnx").collection("takeassignments");
    const commentsCollection = client.db("learnx").collection("comments");
    // await client.connect();
    app.get("/",(req,res)=>{
        res.send("server running")
    });
    // middle ware
    const verifyToken = (req,res,next)=>{
        const token = req?.cookies?.token;
        if(!token){
            return res.status(401).send({message:"unauthorized access"});
        }
        jwt.verify(token,process.env.TOKEN_SECRET,(err,decoded)=>{
            if(err){
                return res.status(401).send({message:"unauthorized access"});
            }
            req.user = decoded;
            next();
        })
      }
      app.get('/pageitem', async(req, res) => {
        const page = parseInt(req.query.page)
        const size = parseInt(req.query.size)
        const result = await assignmentCollection.find()
        .skip(page * size)
        .limit(size)
        .toArray();
        res.send(result);
    })
    app.post('/comment',async(req,res)=>{
        const comment = req.body;
        const result = await commentsCollection.insertOne(comment)
        res.send(result);
    })
    app.get('/comment/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {assaignmentId: id}
        const result = await commentsCollection.find(query).toArray();
        res.send(result)
    })
    // jwt post api
    app.post("/jwt",async(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user,process.env.TOKEN_SECRET,{expiresIn:'1h'});
        res
        .cookie('token',token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({success:true})
    })
    // logout api
    app.post('/logout',async(req,res)=>{
        res
        .clearCookie('token',{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge:0
        })
        .send({success:true})
    })
    app.post("/assignment",async(req,res)=>{
        const assignment = req.body;
        const result = await assignmentCollection.insertOne(assignment);
        res.send(result)
    })
    app.post("/takeassignment",async(req,res)=>{
        const taken = req.body;
        const result = await takeassignments.insertOne(taken)
        res.send(result);
    })
    app.get("/assignment",async(req,res)=>{
        const cursor = assignmentCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get('/filter/:target',async(req,res)=>{
        const target = req.params.target;
        const query = {level: target};
        const result = await assignmentCollection.find(query).toArray();
        res.send(result);
    })
    app.get("/pending",verifyToken,async(req,res)=>{
        let query = {status:"Pending"};
        const result = await takeassignments.find(query).toArray();
        res.send(result);
    })
    app.get("/pending/:id",verifyToken,async(req,res)=>{
        const id = req.params.id;
        let query = {_id: new ObjectId(id)};
        const result = await takeassignments.findOne(query);
        res.send(result);
    })
    app.delete('/assignment/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await assignmentCollection.deleteOne(query)
        res.send(result);

    })
    app.get("/assignment/:id",async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await assignmentCollection.findOne(query);
        res.send(result);
    })
    app.get("/myattemp",verifyToken,async(req,res)=>{
        if(req.user.email !== req.query.email){
            return res.send({message:"Forbidden Access"});
        }
        let query = {}
        if(req.query?.email){
            query = {takenuser: req.query?.email}
        }
        const items = takeassignments.find(query);
        const result = await items.toArray();
        res.send(result)
    })
    app.put('/update/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updateData = req.body;
        const updatedData = {
            $set:{
                title: updateData.title,
                mark: updateData.mark,
                level: updateData.level,
                date: updateData.date,
                photo: updateData.photo,
                des: updateData.des
            }
        }
        const result = await assignmentCollection.updateOne(filter,updatedData);
        res.send(result);
    })
    app.patch("/givenassignment/:id",async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const added = req.body;
        const options = { upsert: true };
        const updatedTaken = {
            $set:{
                status: "Complete",
                archiveMark: added.archiveMark,
                feedBack: added.feedback,
                examiner: added.examiner
            }
        }
        const result = await takeassignments.updateOne(filter,updatedTaken,options)
        res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log(`server runnig on port ${port}`)
})
