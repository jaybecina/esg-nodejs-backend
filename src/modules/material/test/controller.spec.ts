require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { it } from 'mocha';
import request from "supertest";
import dayjs from 'dayjs';
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';

import { FormTemplatePostDto } from '../../form-template/interfaces/dto';
import { MaterialPostDto } from '../interfaces/dto';
import { inputType, qnaType } from '../interfaces/materialForm';
import { sampleCompanies } from "../../company/test/sample";
import { FormPostDto } from '../../form/interfaces/dto';
import { getComingFinancialYearEndDate } from '../../form/test/sample';
import { sampleTextOnlyMatrixMaterial } from './sample';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let jwt: string;
const path = 'material';

describe('material controller', () => {
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

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    jwt = response.body.data;
  });

  it('should successfully create and get text material and allow super admin only', async function () {
    const res1 = await request(app).post(`/${path}`).send(sampleTextMaterial);
    expect(res1.status).equal(403);

    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleTextMaterial);
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${res2.body.data}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(res3.body.data).deep.includes(sampleTextMaterial);
  });

  it('should successfully create and get matrix material', async function () {
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleMatrixMaterial);
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${res2.body.data}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(res3.body.data).deep.includes(sampleMatrixMaterial);
  });

  it('should reject if duplicated uniqueId', async function () {
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleTextMaterial);

    expect(res2.status).equal(500);
    expect(res2.body.message).equal('This unique id is used');
  })

  it('should get the material list', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(2);
    expect(res1.body.meta.count).equal(res1.body.data.length);
    expect(res1.body.meta.page).equal(1);
  })

  it('should sort the material list by updateAt asc', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);    
    expect(res1.status).equal(200);

    let compareDate = dayjs(res1.body.data[0].updatedAt);

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(compareDate.isBefore(dayjs(res1.body.data[i].updatedAt))).equal(true);
      compareDate = dayjs(res1.body.data[i].updatedAt);
    }
  })

  it('should sort the material list by updateAt desc', async () => {
    const res1 = await request(app).get(`/${path}?sort[updatedAt]=-1`)
      .set('Authorization', `Bearer ${jwt}`);    
    expect(res1.status).equal(200);

    let compareDate = dayjs(res1.body.data[0].updatedAt);

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(compareDate.isAfter(dayjs(res1.body.data[i].updatedAt))).equal(true);
      compareDate = dayjs(res1.body.data[i].updatedAt);
    }
  })

  it('should get the bookmarked / non-bookmarked material list', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    const materialId = res1.body.data[0]._id;

    // create bookmark
    const res2 = await request(app).post(`/bookmark`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        collectionName: 'material',
        documentId: materialId,
      });
    expect(res2.status).equal(200);

    // get bookmarked material list
    const res3 = await request(app).get(`/${path}?bookmarked=true`).set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).to.be.an('array');
    expect(res3.body.data.length).equal(1);
    expect(res3.body.meta.count).equal(res3.body.data.length);
    expect(res3.body.meta.page).equal(1);
    expect(res3.body.data[0]._id).equal(materialId);

    // get non-bookmarked material list
    const res4 = await request(app).get(`/${path}?bookmarked=false`).set('Authorization', `Bearer ${jwt}`);
    expect(res4.status).equal(200);
    expect(res4.body.data).to.be.an('array');
    expect(res4.body.data.length).equal(1);
    expect(res4.body.meta.count).equal(res4.body.data.length);
    expect(res4.body.meta.page).equal(1);
    expect(res4.body.data[0]._id).not.equal(materialId);
  })

  it('should able to update a material with same type', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)

    const idToUpdate = res1.body.data[res1.body.data.length - 1]._id;

    const updatedTextMaterial = {
      ...sampleTextMaterial,
      content: [{
        question: 'new question',
        hints: 'new hints'
      }]
    };

    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(updatedTextMaterial);
    expect(res2.status).equal(200);
    expect(res2.body.data).to.be.a('string');
    expect(res2.body.data).to.have.lengthOf(24);

    // Material update will create new entry and keep the old version
    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    const newDocId = res3.body.data[res3.body.data.length - 1]._id;
    const res4 = await request(app).get(`/${path}/${newDocId}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(res4.body.data).deep.includes(updatedTextMaterial);
  });

  it('should reject to update a material content without changing type', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)

    const idToUpdate = res1.body.data[res1.body.data.length - 1]._id;

    const updatedTextMaterial = {
      ...sampleTextMaterial,
      content: [
        {
          rows: [{ name: 'updated row' }],
          columns: [
            {
              "name": "updated column",
              "inputType": inputType.number,
              "outputUnit": "ml"
            }
          ]
        }]
    };

    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(updatedTextMaterial);
    expect(res2.status).equal(400)
  });

  it('should able to update a material content and changing type', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)

    const idToUpdate = res1.body.data[res1.body.data.length - 1]._id;

    const updatedTextMaterial = {
      ...sampleTextMaterial,
      type: qnaType.matrix,
      content: [
        {
          rows: [{ name: 'updated row' }],
          columns: [
            {
              "name": "updated column",
              "inputType": inputType.number,
              "outputUnit": "ml"
            }
          ]
        }]
    };

    updatedTextMaterial.type = qnaType.matrix;
    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(updatedTextMaterial);
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    const newDocId = res3.body.data[res3.body.data.length - 1]._id;
    const res4 = await request(app).get(`/${path}/${newDocId}`)
      .set('Authorization', `Bearer ${jwt}`);

    expect(res4.body.data).deep.includes(updatedTextMaterial);
  });

  it('should not able to update old entry', async function () {
    const res1 = await request(app).get(`/${path}?filters[latest]=false`)
      .set('Authorization', `Bearer ${jwt}`);
    const idToUpdate = res1.body.data.find(i => !i.latest)._id;

    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleTextMaterial);
    expect(res2.status).equal(500);

    // Check the original will not be updated before successfully updated
    const res3 = await request(app).get(`/${path}?filters[latest]=false`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.body.data.count).equal(res3.body.data.count);
  })

  it('should not able to update duplicate uniqueId with version', async () => {
    const res1 = await request(app).get(`/${path}?filters[latest]=true`)
      .set('Authorization', `Bearer ${jwt}`);

    const idToUpdate = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${idToUpdate}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleTextMaterial);
    expect(res2.status).equal(500);
    expect(res2.body.message).equal('Unique Id is duplicated. Please rename the material name');
  })

  it('should get pointers of that material', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data.length).equal(2);

    const material = res1.body.data[1];

    const res2 = await request(app).get(`/${path}/${material._id}/pointer`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const pointers = res2.body.data;
    for (const pointer of pointers) {
      expect(pointer.materialId).equal(material._id);
      expect(pointer.materialUniqueId).equal(material.uniqueId);
      expect(pointer.method).to.be.oneOf(['sum', 'countif']);
      expect(pointer.row).gte(-1);
      expect(pointer.col).gte(-1);

      if (pointer.method === 'sum') {
        expect(pointer.payload).to.be.empty;
      } else if (pointer.method === 'countif') {
        expect(pointer.payload).to.have.all.keys('search');
        expect(pointer.payload.search).equal('');
      }
    }
  })

  it('should get "countif" pointer only when the matrix is text only', async () => {
    // get material
    const postTextOnlyMaterialRes = await request(app).post(`/material`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleTextOnlyMatrixMaterial);    

    // get material pointer
    const materialId = postTextOnlyMaterialRes.body.data;
    const res2 = await request(app).get(`/material/${materialId}/pointer`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res2.status).equal(200);

    const isSumMethodInPointers = res2.body.data.some(pointer => {
      return pointer.method === 'sum';
    });
    expect(isSumMethodInPointers).equal(false);
  })

  it('should not able to delete a material if form template / form is using', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)

    const idToDelete = res1.body.data[0]._id;

    const sampleFormTemplate: FormTemplatePostDto = {
      name: 'Gas consumption Form',
      uniqueId: 'gas-consumption-form',
      materials: [idToDelete],
    }

    // create a material form template
    const res2 = await request(app).post(`/form-template`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleFormTemplate);
    expect(res2.status).equal(200);
    const formTemplateId = res2.body.data;

    // can't delete material if form template is using
    const res3 = await request(app).delete(`/${path}/${idToDelete}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res3.status).equal(500);

    // create company
    const postCompanyRes = await request(app).post(`/company`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sampleCompanies[0]);
    expect(postCompanyRes.status).equal(200);

    // create form
    const formPostDto: FormPostDto = {
      formTemplate: formTemplateId,
      company: postCompanyRes.body.data,
      financialYear: getComingFinancialYearEndDate(),
      assignees: null
    }

    const postFormRes = await request(app).post(`/form`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(formPostDto)
    expect(postFormRes.status).equal(200);
    const formId = postFormRes.body.data;

    // can't delete material if form template & form are using
    const res4 = await request(app).delete(`/${path}/${idToDelete}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res4.status).equal(500);

    // delete form template
    const deleteFormTemplateRes = await request(app).delete(`/form-template/${formTemplateId}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(deleteFormTemplateRes.body.data).is.true;

    // can't delete material if form is using
    const res5 = await request(app).delete(`/${path}/${idToDelete}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res5.status).equal(500);

    // delete the form
    const deleteFormRes = await request(app).delete(`/form/${formId}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(deleteFormRes.body.data).is.true;
  })

  it('should able to delete a material', async function () {
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

  it('should have 3 add material log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'material',
          action: 'add'
      }).exec()
      expect(result.length).equal(3);
  })

  it('should have 2 edit material log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'material',
          action: 'edit'
      }).exec()
      expect(result.length).equal(2);
  })

  it('should have 1 delete material log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'material',
          action: 'delete'
      }).exec()
      expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
});