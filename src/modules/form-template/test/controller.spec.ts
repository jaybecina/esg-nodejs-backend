require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';

import { MaterialPostDto } from '../../material/interfaces/dto';
import { inputType, qnaType } from '../../material/interfaces/materialForm';
import { FormTemplatePostDto } from '../interfaces/dto'
import { IFormTemplate } from '../interfaces/formTemplate'

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let jwt: string;

const path = 'form-template';

describe('form template controller', () => {
  const sampleTextMaterial: MaterialPostDto = {
    "name": "Gas consumption 1",
    "uniqueId": "gas-consumption-1",
    "size": 4,
    "type": qnaType.text,
    "content": [
      {
        "question": "question 1",
        "hints": "hint1"
      },
      {
        "question": "question 2",
        "hints": "hint1"
      }
    ]
  };

  const sampleMatrixMaterial: MaterialPostDto = {
    "name": "Gas consumption 2",
    "uniqueId": "gas-consumption-2",
    "size": 4,
    "type": qnaType.matrix,
    "content": [
      {
        "rows": [
          { "name": "rn1" },
          { "name": "rn2" }
        ],
        "columns": [
          {
            "name": "c1",
            "inputType": inputType.text,
            "outputUnit": "L"
          },
          {
            "name": "c2",
            "inputType": inputType.text,
            "outputUnit": "L"
          }
        ]
      }]
  };

  const sampleMaterialIds: string[] = [];

  const sampleFormTemplate: FormTemplatePostDto = {
    name: 'Gas consumption Form',
    uniqueId: 'gas-consumption-form',
    materials: sampleMaterialIds, // will add IDs in 'should create a material form template with 2 materials by super admin'
  }

  const sampleFormTemplate2: FormTemplatePostDto = {
    name: 'Apendix A2',
    uniqueId: 'apendix-a2',
    materials: sampleMaterialIds, // will add IDs in 'should create a material form template with 2 materials by super admin'
  }

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    jwt = response.body.data;
  });

  it('should allow super admin only', async function () {
    const res1 = await request(app).get(`/${path}`);
    expect(res1.status).equal(403);

    const res2 = await request(app).post(`/${path}`).send(sampleFormTemplate);
    expect(res2.status).equal(403);

    const res3 = await request(app).put(`/${path}/random-id`);
    expect(res3.status).equal(403);

    const res4 = await request(app).delete(`/${path}/random-id`);
    expect(res4.status).equal(403);
  })

  it('should create and get a form template with 2 materials by super admin', async () => {
    for (const sampleMaterial of [sampleTextMaterial, sampleMatrixMaterial]) {
      const res = await request(app).post(`/material`)
        .set('Authorization', `Bearer ${jwt}`)
        .send(sampleMaterial);
      expect(res.status).equal(200);
      sampleMaterialIds.push(res.body.data);
    }

    // create a material form template
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleFormTemplate);
    expect(res1.status).equal(200);

    const res2 = await request(app).get(`/${path}/${res1.body.data}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res2.body.data).deep.includes(sampleFormTemplate);
  })

  it('should reject if duplicated uniqueId', async function () {
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleFormTemplate);

    expect(res2.status).equal(500);
  });

  it('should get array of form template', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(1);
    expect(res1.body.meta.count).equal(res1.body.data.length);
    expect(res1.body.meta.page).equal(1);

    expect(res1.body.data[0]).deep.includes(sampleFormTemplate);
  });

  it('should use filters to get array of form template', async function () {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleFormTemplate2);
    expect(res1.status).equal(200);

    const res2 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${jwt}`);
    expect(res2.status).equal(200);
    expect(res2.body.data).to.be.an('array');
    expect(res2.body.data.length).equal(2);
    expect(res2.body.meta.count).equal(res2.body.data.length);
    expect(res2.body.meta.page).equal(1);

    // use filters
    const fieldNames: (keyof Omit<IFormTemplate, '_id' | 'materials'>)[] = ['name', 'uniqueId'];
    for (const fieldName of fieldNames) {
      const res3 = await request(app)
        .get(`/${path}?filters[${fieldName}]=${sampleFormTemplate[fieldName]}`)
        .set('Authorization', `Bearer ${jwt}`);
      expect(res3.status).equal(200);
      expect(res3.body.data).to.be.an('array');
      expect(res3.body.data.length).equal(1);
      expect(res3.body.meta.count).equal(res3.body.data.length);
      expect(res3.body.meta.page).equal(1);

      for (const formTemplate of res3.body.data) {
        expect(formTemplate[fieldName]).equal(sampleFormTemplate[fieldName]);
      }
    }
  })

  it('should use search to get array of form template', async function () {
    // use search
    const res = await request(app).get(`/${path}?search=gas`).set('Authorization', `Bearer ${jwt}`);
    expect(res.status).equal(200);
    expect(res.body.data).to.be.an('array');
    expect(res.body.data.length).equal(1);
    expect(res.body.meta.count).equal(res.body.data.length);
    expect(res.body.meta.page).equal(1);

    expect(res.body.data[0]).deep.includes(sampleFormTemplate);
  })

  it('should able to update a form template', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);

    const idToUpdate = res1.body.data[0]._id;

    const updatedFromTemplate: FormTemplatePostDto = {
      name: `Update ${sampleFormTemplate.name}`,
      uniqueId: `updated-${sampleFormTemplate.uniqueId}`,
      materials: sampleFormTemplate.materials.slice(0, 1),
    }

    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(updatedFromTemplate);
    expect(res2.status).equal(200);

    // update form template
    const res3 = await request(app).get(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).deep.includes(updatedFromTemplate);

    // reset sample form template
    const res4 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleFormTemplate);
    expect(res4.status).equal(200);
  });

  it('should reject if one of material is not latest when create from template', async () => {
    // update material
    const updatedTextMaterial = {
      ...sampleTextMaterial,
      content: [{
        question: 'new question',
        hints: 'new hints'
      }]
    };

    const oldMaterialId = sampleMaterialIds[0];

    const res2 = await request(app).put(`/material/${sampleMaterialIds[0]}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(updatedTextMaterial);
    expect(res2.status).equal(200);
    sampleMaterialIds[0] = res2.body.data;

    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    const idToUpdate = res3.body.data[0]._id;

    const res4 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        ...sampleFormTemplate,
        materials: [oldMaterialId]
      });
    expect(res4.status).equal(500);
  })

  it('should able to delete a form template', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)

    const idToDelete = res1.body.data[0]._id;

    const res2 = await request(app).delete(`/${path}/${idToDelete}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res2.body.data).is.true;

    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res3.body.data.length).equal(res1.body.data.length - 1);
  });

  it('should have 2 add form template log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form-template',
      action: 'add'
    }).exec()
    expect(result.length).equal(2);
  })

  it('should have 2 edit form template log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form-template',
      action: 'edit'
    }).exec()
    expect(result.length).equal(2);
  })

  it('should have 1 delete form template log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form-template',
      action: 'delete'
    }).exec()
    expect(result.length).equal(1);
  })


  after(async () => {
    await shutdown();
  });
})
