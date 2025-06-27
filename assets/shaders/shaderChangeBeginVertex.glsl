float heightValue = texture2D( heightmap, uv ).x;
vec3 transformed = vec3( position.x, position.y, heightValue );
#ifdef USE_ALPHAHASH
    vPosition = vec3( position );
#endif