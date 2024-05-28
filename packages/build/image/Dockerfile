FROM public.ecr.aws/codebuild/amazonlinux-x86_64-lambda-standard:nodejs20

# configure npm
ENV NPM_CONFIG_CACHE=/tmp/.npm

# configure pnpm
RUN npm config --global delete prefix \
  && npm install -g pnpm@9.1.2 \
  && npm config --global set prefix /tmp/opt/npm \
  && pnpm config set store-dir /tmp/pnpm

# install SST Ion
RUN touch /tmp/.bashrc \
  && curl -fsSL https://ion.sst.dev/install | bash \
  && mv /tmp/.sst/bin/sst /usr/local/bin/sst \
  && sst version

# Cleanup
RUN rm -fr /tmp/*

COPY index.mjs ${LAMBDA_TASK_ROOT}

ENTRYPOINT [ "/lambda-entrypoint.sh" ]
CMD ["index.handler"]

# how to build
# $ docker logout public.ecr.aws
# $ AWS_PROFILE=sst-dev aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 917397401067.dkr.ecr.us-east-1.amazonaws.com
# $ docker build --platform linux/amd64 --tag 917397401067.dkr.ecr.us-east-1.amazonaws.com/images:x86_64-1 .
# $ docker push 917397401067.dkr.ecr.us-east-1.amazonaws.com/images:x86_64-1