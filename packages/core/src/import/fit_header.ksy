# FIT file header — Garmin Flexible and Interoperable Data Transfer
# Spec: https://developer.garmin.com/fit/protocol/
# Companion runtime: fitHeader.ts (kept in sync manually)
meta:
  id: fit_header
  title: Garmin FIT file header
  application: Garmin / Polar / Suunto / Wahoo / Coros activity files
  file-extension: fit
  xref:
    mime: application/vnd.ant.fit
  license: CC0-1.0
  endian: le
  ks-version: 0.10
seq:
  - id: header_size
    type: u1
    doc: Size of this header in bytes (12 or 14)
  - id: protocol_version
    type: u1
  - id: profile_version
    type: u2
  - id: data_size
    type: u4
    doc: Size of the data records section (excludes header and CRC)
  - id: data_type
    contents: ".FIT"
  - id: header_crc
    type: u2
    if: header_size >= 14
    doc: CRC of bytes 0..11; present only when header_size is 14
