/**
 * [가변 너비 문자열 저장]
 * 고정 너비 저장소는 계약서, 소설, 이력서와 같은 큰 텍스트 블록의 경우 비효율적입니다.
 * 모든 문서를 가장 긴 길이로 채우면 많은 공간이 낭비될 수 있기 때문입니다.
 * 이를 바이너리로 저장하는 다른 방법은 각 항목을(길이, 텍스트) 쌍으로 저장하는 것입니다.
 */

// 1. 문자열 목록을 입력으로 받아 (길이, 텍스트) 쌍을 포함하는 `ArrayBuffer`를 반환하는 함수를 작성합니다.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const HEADER_SIZE = 4; // 32비트, 최대 4GB까지 저장 가능

/** 입력한 문자열 배열을 (length, text) 쌍의 연속 바이트로 직렬화
 * Format: [length:uint32][bytes...][length:uint32][bytes...]...
 * https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
 */
export function encodeStrings(strings: string[]): ArrayBuffer {
    // 1) 모든 문자열을 UTF-8로 인코딩. 직렬화·역직렬화 할 때 호환성 문제가 거의 없고 정확한 byte 수 계산 가능
    // ex_ "ABC" => [65, 66, 67] => buffer size 7(3 + 헤더 4)
    const utf8ByteArrays = strings.map((str) => encoder.encode(str));
    const totalBufferSize = utf8ByteArrays.reduce(
        (sum, bytes) => sum + HEADER_SIZE + bytes.length,
        0
    );

    // 2) ArrayBuffer 할당 후 DataView로 길이 헤더와 바디 쓰기
    const buffer = new ArrayBuffer(totalBufferSize); // 주어진 size 만큼 빈 메모리 확보
    const viewForHeader = new DataView(buffer); // 헤더용: 다양한 숫자 타입 기록 가능 (uint32, int16, float32 등)
    const viewForContent = new Uint8Array(buffer); // 본문용: 바이트 배열 그대로 복사/읽기
    let cursor = 0;

    for (const bytes of utf8ByteArrays) {
        // 현재 cursor 위치에 문자열 길이(바이트 수)를 4바이트(uint32)로 기록
        viewForHeader.setUint32(cursor, bytes.length, true);
        cursor += HEADER_SIZE;

        // 본문 기록
        viewForContent.set(bytes, cursor);
        cursor += bytes.length;
    }

    return buffer;
}


// 2. 이러한 ArrayBuffer를 받아 원본 텍스트가 포함된 배열을 반환하는 다른 함수를 작성합니다.

/** (length, text) 직렬화 버퍼를 원래 문자열 배열로 복원 */
export function decodeStrings(buffer: ArrayBuffer): string[] {
    const viewForHeader = new DataView(buffer);       // 헤더용: 다양한 숫자 타입 읽기 (uint32, etc.)
    const viewForContent = new Uint8Array(buffer);    // 본문용: 바이트 배열 그대로 슬라이스/복사
    const result: string[] = [];

    let cursor = 0;
    const bufferEnd = viewForContent.byteLength;

    while (cursor < bufferEnd) {
        // 헤더(4바이트) 존재 여부 체크
        if (cursor + HEADER_SIZE > bufferEnd) {
            throw new RangeError("Truncated buffer: missing length header");
        }

        // 헤더에서 본문 크기 읽어오기
        const bytesLength = viewForHeader.getUint32(cursor,true);
        cursor += HEADER_SIZE;

        // 본문 범위 체크
        const contentEnd = cursor + bytesLength;
        if (contentEnd > bufferEnd) {
            throw new RangeError("Truncated buffer: missing string bytes");
        }

        // 본문 디코드 (subarray: 원본 복사 없이 지정한 만큼 읽어옴)
        const contentSlice = viewForContent.subarray(cursor, contentEnd);
        const decodedString = decoder.decode(contentSlice);
        result.push(decodedString);

        // 다음 레코드로 이동
        cursor = contentEnd;
    }

    return result;
}

// 3. Mocha로 테스트를 작성해서 함수가 올바르게 작동하는지 확인합니다.