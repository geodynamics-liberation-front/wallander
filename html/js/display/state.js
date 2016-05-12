/*
To seralize the status bar record the visible state of each status, units and format come from the reference data_field and 
are seralized with the data fields.

To seralize the data fields properties:
 "path": "/StagYY/psd/psd00/psd_00017/eta"
 "display_name": "Viscosity"
 "unit": "Pa s"
 "format": "%01.e"
 "dimension_unit": "m"
 "dimension_format": "%_d"
 "time_format": "%_d"
 "time_unit": "s"
 "renderer": "PuBu_log-1e19-1e24-2DD6D633"
 "visible": true


To deseralize:
Load the data_field
Add data_field to data_field_manager
Apply seralized properties
*/
