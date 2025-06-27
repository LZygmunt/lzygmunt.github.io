vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
vec3 objectNormal = vec3(
( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
1.0 );
#ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
#endif