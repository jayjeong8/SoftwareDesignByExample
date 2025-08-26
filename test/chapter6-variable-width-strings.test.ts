import { strict as assert } from "assert";
import {encodeStrings,decodeStrings} from "../chapter6-date_tables/saving-variable-width-strings.js";

// 하드코딩 바이트 배열 → ArrayBuffer 변환 유틸
function toBuffer(bytes: number[]): ArrayBuffer {
    const buf = new ArrayBuffer(bytes.length);
    new Uint8Array(buf).set(bytes);
    return buf;
}

// ArrayBuffer → 숫자 배열 (비교 편의)
function toBytes(buf: ArrayBuffer): number[] {
    return Array.from(new Uint8Array(buf));
}

describe("가변 길이 문자열 직렬화/역직렬화", () => {
    describe("encodeStrings (인코딩)", () => {
        it("ASCII 문자열들을 길이-본문 포맷(LE)으로 올바르게 인코딩한다", () => {
            const input = ["ABC", "D", ""];
            const expected = toBuffer([
                0x03,0x00,0x00,0x00, 0x41,0x42,0x43,
                0x01,0x00,0x00,0x00, 0x44,
                0x00,0x00,0x00,0x00,
            ]);
            const buf = encodeStrings(input);
            assert.deepEqual(toBytes(buf), toBytes(expected));
        });

        it("유니코드(한글/이모지)를 올바르게 인코딩한다 (UTF-8, LE 헤더)", () => {
            const input = ["한글", "😀"];
            const expected = toBuffer([
                0x06,0x00,0x00,0x00, 0xED,0x95,0x9C,0xEA,0xB8,0x80,
                0x04,0x00,0x00,0x00, 0xF0,0x9F,0x98,0x80,
            ]);
            const buf = encodeStrings(input);
            assert.deepEqual(toBytes(buf), toBytes(expected));
        });

        it("빈 배열은 길이 0의 버퍼를 생성한다", () => {
            const buf = encodeStrings([]);
            assert.equal(buf.byteLength, 0);
        });

        it("악상 부호가 포함된 라틴 문자(café)를 올바르게 인코딩한다", () => {
            const input = ["café"];
            const expected = toBuffer([
                0x05,0x00,0x00,0x00, 0x63,0x61,0x66,0xC3,0xA9,
            ]);
            const buf = encodeStrings(input);
            assert.deepEqual(toBytes(buf), toBytes(expected));
        });
    });

    describe("decodeStrings (디코딩)", () => {
        it("ASCII 다중 항목 버퍼를 올바르게 디코딩한다", () => {
            const buf = toBuffer([
                0x03,0x00,0x00,0x00, 0x41,0x42,0x43,
                0x01,0x00,0x00,0x00, 0x44,
                0x00,0x00,0x00,0x00,
            ]);
            const out = ["ABC", "D", ""];
            assert.deepEqual(decodeStrings(buf), out);
        });

        it("유니코드(한글/이모지) 버퍼를 올바르게 디코딩한다", () => {
            const buf = toBuffer([
                0x06,0x00,0x00,0x00, 0xED,0x95,0x9C,0xEA,0xB8,0x80,
                0x04,0x00,0x00,0x00, 0xF0,0x9F,0x98,0x80,
            ]);
            const out = ["한글", "😀"];
            assert.deepEqual(decodeStrings(buf), out);
        });

        it("중간에 빈 문자열(길이 0)이 포함된 버퍼를 디코딩한다", () => {
            const buf = toBuffer([
                0x05,0x00,0x00,0x00, 0x61,0x6C,0x70,0x68,0x61,
                0x00,0x00,0x00,0x00,
                0x05,0x00,0x00,0x00, 0xCE,0xB2,0x65,0x74,0x61,
                0x00,0x00,0x00,0x00,
            ]);
            const out = ["alpha", "", "βeta", ""];
            assert.deepEqual(decodeStrings(buf), out);
        });

        it("빈 버퍼는 빈 배열을 반환한다", () => {
            const buf = new ArrayBuffer(0);
            assert.deepEqual(decodeStrings(buf), []);
        });
    });

    describe("에러 및 엣지 케이스", () => {
        it("헤더가 잘린(4바이트 미만) 버퍼는 에러를 던진다", () => {
            const truncatedHeader = toBuffer([0x01, 0x00]);
            assert.throws(() => decodeStrings(truncatedHeader), /length header/i);
        });

        it("본문이 선언된 길이보다 짧으면 에러를 던진다", () => {
            const bad = toBuffer([
                0x03,0x00,0x00,0x00, 0x41,0x42
            ]);
            assert.throws(() => decodeStrings(bad), /string bytes/i);
        });

        it("len=0(빈 문자열)만 있는 버퍼도 정상 처리된다", () => {
            const buf = toBuffer([0x00,0x00,0x00,0x00]);
            const out = [""];
            assert.deepEqual(decodeStrings(buf), out);
        });
    });
});